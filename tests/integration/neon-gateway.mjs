// Synthetic fixtures and optional draft migration are always rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
const url = new URL(
  process.env.DATABASE_MIGRATION_URL ?? "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Synthetic target refused");
url.search = "";
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
});
const c = await pool.connect();
let checks = 0;
async function rejected(sql, args, pattern) {
  await c.query("savepoint rejected_operation");
  try {
    await assert.rejects(c.query(sql, args), pattern);
    checks++;
  } finally {
    await c.query("rollback to savepoint rejected_operation");
  }
}
try {
  await c.query("begin; set local search_path=public,extensions");
  if (process.argv.includes("--draft"))
    await c.query(
      await readFile(
        new URL(
          "../../database/migrations/017_gateway_payments.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  const patient = randomUUID(),
    other = randomUUID(),
    provider = randomUUID(),
    session = randomUUID(),
    unverified = randomUUID(),
    booking = randomUUID(),
    service = randomUUID();
  for (const [id, role] of [
    [patient, "patient"],
    [other, "patient"],
    [provider, "provider"],
  ]) {
    await c.query(
      `insert into public.identity_users(id,name,email,"emailVerified","accountType",profession) values($1,'Synthetic gateway test',$2,true,$3,$4)`,
      [id, `${id}@gateway.test`, role, role === "provider" ? "nurse" : null],
    );
  }
  for (const [id, verified] of [
    [session, true],
    [unverified, false],
  ])
    await c.query(
      `insert into public.identity_sessions(id,"userId",token,"expiresAt","updatedAt","mfaVerified","emailOtpVerified") values($1,$2,$3,now()+interval '1 hour',now(),false,$4)`,
      [id, patient, randomUUID(), verified],
    );
  await c.query(
    "insert into public.services(id,name,category,description,duration_minutes,price_minor,currency) values($1,'Synthetic payment service','nurse','Synthetic only',60,350000,'PKR')",
    [service],
  );
  await c.query(
    "insert into public.bookings(id,patient_id,provider_id,service_id,starts_at,ends_at,busy_until,address,area,status,price_minor,currency,request_key) values($1,$2,$3,$4,now()+interval '30 days',now()+interval '30 days 1 hour',now()+interval '30 days 2 hours','Synthetic test address','Test area','Confirmed',350000,'PKR',$5)",
    [booking, patient, provider, service, randomUUID()],
  );
  await rejected(
    "select private.gateway_begin($1,$2,'sandbox')",
    [unverified, booking],
    /Not permitted|verification/i,
  );
  await c.query('update public.identity_sessions set "userId"=$1 where id=$2', [
    other,
    session,
  ]);
  await rejected(
    "select private.gateway_begin($1,$2,'sandbox')",
    [session, booking],
    /Not permitted/,
  );
  await c.query('update public.identity_sessions set "userId"=$1 where id=$2', [
    patient,
    session,
  ]);
  await c.query("update public.bookings set status='Requested' where id=$1", [
    booking,
  ]);
  await rejected(
    "select private.gateway_begin($1,$2,'sandbox')",
    [session, booking],
    /not payable/,
  );
  await c.query("update public.bookings set status='Confirmed' where id=$1", [
    booking,
  ]);
  assert.equal(
    (
      await c.query(
        "select has_function_privilege('careathome_auth','private.gateway_begin(uuid,uuid,text)','EXECUTE') as allowed",
      )
    ).rows[0].allowed,
    true,
  );
  checks++;
  const {
    rows: [payment],
  } = await c.query("select * from private.gateway_begin($1,$2,'sandbox')", [
    session,
    booking,
  ]);
  assert.equal(payment.amount_minor, 350000);
  checks++;
  await rejected(
    "select private.gateway_begin($1,$2,'sandbox')",
    [session, booking],
    /initialization is pending/,
  );
  await rejected(
    "select private.gateway_bind($1,$2,$3,$4)",
    [session, payment.id, randomUUID(), `track_${randomUUID()}`],
    /initialization changed/,
  );
  const tracker = `track_${randomUUID()}`;
  await c.query("select private.gateway_bind($1,$2,$3,$4)", [
    session,
    payment.id,
    payment.setup_nonce,
    tracker,
  ]);
  assert.equal(
    (
      await c.query("select id from private.gateway_begin($1,$2,'sandbox')", [
        session,
        booking,
      ])
    ).rows[0].id,
    payment.id,
  );
  checks++;
  await rejected(
    "select private.gateway_begin($1,$2,'production')",
    [session, booking],
    /environment mismatch/,
  );
  const eventSQL = "select private.gateway_event('sandbox',$1,$2,$3,$4,$5,$6)";
  const capture = `evt_${randomUUID()}`;
  await rejected(
    eventSQL,
    [capture, tracker, "payment.succeeded", 1, "PKR", null],
    /total mismatch/,
  );
  await c.query(eventSQL, [
    capture,
    tracker,
    "payment.succeeded",
    350000,
    "PKR",
    null,
  ]);
  await c.query(eventSQL, [
    capture,
    tracker,
    "payment.succeeded",
    350000,
    "PKR",
    null,
  ]);
  await c.query(eventSQL, [
    `evt_${randomUUID()}`,
    tracker,
    "payment.failed",
    null,
    null,
    null,
  ]);
  await c.query("reset role");
  assert.equal(
    (
      await c.query("select status from public.gateway_payments where id=$1", [
        payment.id,
      ])
    ).rows[0].status,
    "Paid",
  );
  checks++;
  assert.equal(
    (
      await c.query(
        "select count(*)::int as n from private.gateway_events where event_id=$1",
        [capture],
      )
    ).rows[0].n,
    1,
  );
  checks++;
  for (const balance of [300000, 340000, 0, 300000])
    await c.query(eventSQL, [
      `evt_${randomUUID()}`,
      tracker,
      "payment.refunded",
      null,
      "PKR",
      balance,
    ]);
  const {
    rows: [refunded],
  } = await c.query(
    "select status,refunded_minor from public.gateway_payments where id=$1",
    [payment.id],
  );
  assert.deepEqual(refunded, { status: "Refunded", refunded_minor: 350000 });
  checks++;
  assert.equal(
    (await c.query("select status from public.bookings where id=$1", [booking]))
      .rows[0].status,
    "Confirmed",
  );
  checks++;
  await rejected(
    "select public.simulate_payment($1,'success')",
    [booking],
    /cannot be simulated/,
  );
  for (const [role, column, expected] of [
    ["authenticated", "id", true],
    ["authenticated", "tracker", false],
    ["authenticated", "setup_nonce", false],
    ["anon", "id", false],
  ]) {
    assert.equal(
      (
        await c.query(
          "select has_column_privilege($1,'public.gateway_payments',$2,'SELECT') as allowed",
          [role, column],
        )
      ).rows[0].allowed,
      expected,
    );
    checks++;
  }
  for (const signature of [
    "private.gateway_event(text,text,text,text,integer,text,integer)",
    "private.gateway_begin(uuid,uuid,text)",
    "public.simulate_payment_legacy(uuid,text)",
  ]) {
    assert.equal(
      (
        await c.query(
          "select has_function_privilege('authenticated',$1,'EXECUTE') as allowed",
          [signature],
        )
      ).rows[0].allowed,
      false,
    );
    checks++;
  }
  console.log(
    `Gateway: ${checks} checks passed; fixtures${process.argv.includes("--draft") ? " and draft migration" : ""} rolled back.`,
  );
} finally {
  await c.query("rollback");
  c.release();
  await pool.end();
}
