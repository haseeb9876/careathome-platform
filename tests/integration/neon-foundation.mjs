import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { authenticationOptions } from "../../src/lib/database/auth-options.ts";
import { withDatabaseIdentity } from "../../src/lib/database/transaction.ts";

function connection(value, expectedRole) {
  const url = new URL(value || "postgresql://invalid");
  if (
    !/^ep-long-sunset-b3s9l8hr(-pooler)?\.c-4\.ap-southeast-1\.aws\.neon\.tech$/.test(
      url.hostname,
    ) ||
    url.pathname !== "/careathome" ||
    (expectedRole && url.username !== expectedRole)
  )
    throw new Error("Unexpected integration-test target.");
  url.search = "";
  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
    max: 3,
    connectionTimeoutMillis: 10000,
  });
}
const owner = connection(process.env.DATABASE_MIGRATION_URL);
const app = connection(process.env.DATABASE_URL, "careathome_app");
const authPool = connection(process.env.AUTH_DATABASE_URL, "careathome_auth");
const auth = betterAuth(
  authenticationOptions(
    authPool,
    process.env.BETTER_AUTH_SECRET,
    "http://127.0.0.1:3000",
  ),
);
let passed = 0;
const check = (label) => {
  passed++;
  console.log("PASS " + label);
};
const suffix = randomBytes(5).toString("hex");
const password = randomBytes(24).toString("base64url");
async function signup(name, role = "patient") {
  const email = `neon-${name}-${suffix}@careathome.test`;
  const result = await auth.api.signUpEmail({
    body: {
      name: `Synthetic ${name}`,
      email,
      password,
      accountType: role,
      ...(role === "provider" ? { profession: "nurse" } : {}),
    },
  });
  assert.ok(result.user.id);
  return { id: result.user.id, email };
}
const query = (user, sql, values = []) =>
  withDatabaseIdentity(
    app,
    user ? { userId: user.id, assurance: "aal1" } : null,
    (c) => c.query(sql, values),
  );
try {
  const roles = await owner.query(
    "select rolname,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb from pg_roles where rolname in ('careathome_app','careathome_auth','careathome_worker')",
  );
  assert.equal(roles.rows.length, 3);
  assert.ok(
    roles.rows.every(
      (r) =>
        !r.rolsuper && !r.rolbypassrls && !r.rolcreaterole && !r.rolcreatedb,
    ),
  );
  check("runtime roles cannot bypass RLS or manage roles/databases");
  const alice = await signup("patient");
  const bob = await signup("other");
  const provider = await signup("provider", "provider");
  const admin = await signup("administrator");
  check(
    "Better Auth creates patients and pending provider through database trigger",
  );
  const providerProfile = await query(
    provider,
    "select verification from public.provider_profiles where id=$1",
    [provider.id],
  );
  assert.equal(providerProfile.rows[0].verification, "Pending");
  check("provider registration defaults to Pending");
  const identity = await authPool.query(
    'select password from public.identity_accounts where "userId"=$1',
    [alice.id],
  );
  assert.ok(
    identity.rows[0].password && identity.rows[0].password !== password,
  );
  check("stored credential is hashed rather than plaintext");
  await assert.rejects(
    auth.api.signUpEmail({
      body: {
        name: "Synthetic escalation",
        email: `escalation-${suffix}@careathome.test`,
        password,
        accountType: "admin",
      },
    }),
  );
  check("registration cannot request administrator privileges");
  const login = await auth.api.signInEmail({
    body: { email: alice.email, password },
  });
  assert.equal(login.user.id, alice.id);
  await assert.rejects(
    auth.api.signInEmail({
      body: { email: alice.email, password: "incorrect-password" },
    }),
  );
  check("valid login succeeds and incorrect password is rejected");
  assert.equal(
    (await query(alice, "select id from public.profiles")).rows.length,
    1,
  );
  assert.equal(
    (await query(alice, "select id from public.profiles where id=$1", [bob.id]))
      .rows.length,
    0,
  );
  check("patient row isolation is enforced in Neon");
  await assert.rejects(
    query(alice, "update public.profiles set role='admin' where id=$1", [
      alice.id,
    ]),
  );
  await assert.rejects(query(alice, "select * from public.identity_accounts"));
  await assert.rejects(query(null, "select * from public.profiles"));
  check(
    "direct role escalation, password-table reads and anonymous profile reads are denied",
  );
  await owner.query("update public.profiles set role='admin' where id=$1", [
    admin.id,
  ]);
  const createdService = await query(
    admin,
    "select public.save_service(null,'Synthetic Neon nursing','nurse','Synthetic integration service only',60,350000,'PKR',true) as id",
  );
  const service = createdService.rows[0].id;
  check("explicitly provisioned administrator can manage services");
  const start = new Date(Date.now() + 72 * 3600000);
  const requestKey = randomUUID();
  const requested = await query(
    alice,
    "select public.request_booking($1,$2,'Synthetic address only','Lahore',$3) as id",
    [service, start.toISOString(), requestKey],
  );
  const booking = requested.rows[0].id;
  const repeated = await query(
    alice,
    "select public.request_booking($1,$2,'Synthetic address only','Lahore',$3) as id",
    [service, start.toISOString(), requestKey],
  );
  assert.equal(repeated.rows[0].id, booking);
  check("booking submission remains idempotent on Neon");
  assert.equal(
    (await query(bob, "select id from public.bookings where id=$1", [booking]))
      .rows.length,
    0,
  );
  await assert.rejects(
    query(
      bob,
      "select public.cancel_booking($1,'Attempted cross-patient cancellation')",
      [booking],
    ),
  );
  check("other patients cannot see or cancel the booking");
  await query(admin, "select public.queue_booking($1)", [booking]);
  await assert.rejects(
    query(admin, "select public.assign_booking($1,$2,'Synthetic assignment')", [
      booking,
      provider.id,
    ]),
  );
  check("pending providers cannot be assigned");
  await query(
    provider,
    "select public.save_provider('Synthetic nurse','Synthetic test qualification',3,'Recovery',array['Lahore'],'Synthetic profile only','+923001234567',$1)",
    [[service]],
  );
  const objectPath = `${provider.id}/${randomUUID()}.pdf`;
  // Metadata-only fixture for database rules; this does not claim an S3 upload pass.
  await owner.query(
    "insert into storage.objects(bucket_id,name,owner_id,metadata) values('credentials',$1,$2,'{\"synthetic_metadata_only\":true}')",
    [objectPath, provider.id],
  );
  await query(
    provider,
    "select public.register_credential($1,current_date+365,'Synthetic database fixture')",
    [objectPath],
  );
  await query(
    admin,
    "select public.verify_provider($1,'Verified','Synthetic test approval')",
    [provider.id],
  );
  await query(provider, "select public.save_availability(null,$1,$2,false)", [
    new Date(start.getTime() - 3600000).toISOString(),
    new Date(start.getTime() + 4 * 3600000).toISOString(),
  ]);
  await query(
    admin,
    "select public.assign_booking($1,$2,'Synthetic verified assignment')",
    [booking, provider.id],
  );
  check(
    "verified provider with service, area and availability can be assigned",
  );
  const collision = await query(
    bob,
    "select public.request_booking($1,$2,'Another synthetic address','Lahore',$3) as id",
    [service, start.toISOString(), randomUUID()],
  );
  await query(admin, "select public.queue_booking($1)", [collision.rows[0].id]);
  await assert.rejects(
    query(
      admin,
      "select public.assign_booking($1,$2,'Conflicting assignment')",
      [collision.rows[0].id, provider.id],
    ),
  );
  check("overlapping provider assignments are rejected");
  await query(alice, "select public.simulate_payment($1,'Paid')", [booking]);
  await query(alice, "select public.simulate_payment($1,'Paid')", [booking]);
  const payments = await query(
    alice,
    "select amount_minor,status from public.payments where booking_id=$1",
    [booking],
  );
  assert.equal(payments.rows.length, 1);
  assert.equal(payments.rows[0].status, "Paid");
  check("simulated payment submissions do not duplicate successful payments");
  await query(
    alice,
    "select public.cancel_booking($1,'Synthetic test completed')",
    [booking],
  );
  await assert.rejects(
    query(admin, "select public.queue_booking($1)", [booking]),
  );
  check("cancelled visits remain terminal");
  const parallel = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      query(i % 2 ? alice : bob, "select auth.uid() as id"),
    ),
  );
  parallel.forEach((r, i) =>
    assert.equal(r.rows[0].id, (i % 2 ? alice : bob).id),
  );
  assert.equal((await query(null, "select auth.uid() as id")).rows[0].id, null);
  check(
    "pooled concurrent requests keep identities isolated and anonymous context empty",
  );
  await owner.query("update public.profiles set active=false where id=$1", [
    alice.id,
  ]);
  assert.equal(
    (await query(alice, "select id from public.bookings")).rows.length,
    0,
  );
  await assert.rejects(
    query(
      alice,
      "select public.request_booking($1,$2,'Synthetic address only','Lahore',$3)",
      [service, start.toISOString(), randomUUID()],
    ),
  );
  check("deactivated accounts lose database read/write access");
  console.log(
    `${passed} Neon foundation checks passed. Synthetic fixtures retained for audit.`,
  );
} finally {
  await Promise.all([owner.end(), app.end(), authPool.end()]);
}
