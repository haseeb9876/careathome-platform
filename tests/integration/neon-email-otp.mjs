import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { owner, createAccount, close } from "./neon-fixtures.mjs";
import { applicationDatabaseConfig } from "../../src/lib/database/config.ts";
import { newOtp, otpDigest } from "../../src/modules/accounts/otp-crypto.ts";
const restricted = new Pool(
  applicationDatabaseConfig(
    { DATABASE_URL: process.env.AUTH_DATABASE_URL },
    "careathome_auth",
  ),
);
const app = new Pool(applicationDatabaseConfig(process.env));
const secret = randomBytes(32).toString("hex");
const emails = [];
let user;
let count = 0;
const pass = (text) => {
  count++;
  console.log("PASS " + text);
};
const digest = (value) => otpDigest(value, secret);
async function issue(purpose = "password") {
  const email = `otp-db-${randomBytes(8).toString("hex")}@careathome.test`;
  emails.push(email);
  const otp = newOtp(secret),
    context = digest("context"),
    ip = digest(email);
  const result = await restricted.query(
    "select private.issue_email_challenge($1,$2,$3,$4,$5,$6,$7) as status",
    [otp.id, user, email, purpose, context, otp.hash, ip],
  );
  assert.equal(result.rows[0].status, "created");
  return { ...otp, email, purpose, context, ip };
}
const deliver = (otp) =>
  restricted.query(
    "update private.email_challenges set delivered_at=now() where id=$1",
    [otp.id],
  );
const consume = (
  otp,
  code = otp.code,
  context = otp.context,
  purpose = otp.purpose,
  email = otp.email,
) =>
  restricted
    .query("select private.consume_email_challenge($1,$2,$3,$4,$5) as valid", [
      otp.id,
      email,
      purpose,
      context,
      digest(`${otp.id}:${code}`),
    ])
    .then((r) => r.rows[0].valid);
try {
  user = (
    await createAccount(
      `otp-owner-${randomBytes(6).toString("hex")}@careathome.test`,
      randomBytes(24).toString("hex"),
      "Synthetic OTP review",
      "patient",
    )
  ).id;
  await assert.rejects(() =>
    app.query("select * from private.email_challenges"),
  );
  await assert.rejects(() =>
    app.query(
      "select private.consume_email_challenge($1,'a','login','b','c')",
      [randomUUID()],
    ),
  );
  pass("application role cannot access OTP secrets or verification functions");
  const pending = await issue();
  assert.equal(await consume(pending), false);
  await deliver(pending);
  pass("undelivered challenges cannot authorize changes");
  assert.equal(await consume(pending, pending.code, digest("other")), false);
  assert.equal(
    await consume(pending, pending.code, pending.context, "admin"),
    false,
  );
  assert.equal(
    await consume(
      pending,
      pending.code,
      pending.context,
      pending.purpose,
      "other@careathome.test",
    ),
    false,
  );
  assert.equal(await consume(pending), true);
  assert.equal(await consume(pending), false);
  pass("codes are recipient/action/context bound and single-use");
  const attempts = await issue();
  await deliver(attempts);
  for (let i = 0; i < 5; i++)
    assert.equal(await consume(attempts, "wrong"), false);
  assert.equal(await consume(attempts), false);
  assert.equal(
    (
      await restricted.query(
        "select attempts from private.email_challenges where id=$1",
        [attempts.id],
      )
    ).rows[0].attempts,
    5,
  );
  pass("five incorrect attempts permanently exhaust a challenge");
  const expired = await issue();
  await deliver(expired);
  await owner.query(
    "update private.email_challenges set expires_at=now()-interval '1 second' where id=$1",
    [expired.id],
  );
  assert.equal(await consume(expired), false);
  pass("expired codes fail");
  const revoked = await issue();
  await deliver(revoked);
  await owner.query(
    "update private.email_challenges set revoked_at=now() where id=$1",
    [revoked.id],
  );
  assert.equal(await consume(revoked), false);
  pass("revoked codes fail");
  const concurrent = await issue();
  await deliver(concurrent);
  assert.equal(
    (await Promise.all([consume(concurrent), consume(concurrent)])).filter(
      Boolean,
    ).length,
    1,
  );
  pass("concurrent verification has one winner");
  const fresh = await issue();
  await deliver(fresh);
  const replacement = newOtp(secret);
  const args = [
    replacement.id,
    user,
    fresh.email,
    fresh.purpose,
    fresh.context,
    replacement.hash,
    fresh.ip,
  ];
  assert.equal(
    (
      await restricted.query(
        "select private.issue_email_challenge($1,$2,$3,$4,$5,$6,$7) as status",
        args,
      )
    ).rows[0].status,
    "cooldown",
  );
  await owner.query(
    "update private.email_challenges set created_at=now()-interval '61 seconds' where id=$1",
    [fresh.id],
  );
  assert.equal(
    (
      await restricted.query(
        "select private.issue_email_challenge($1,$2,$3,$4,$5,$6,$7) as status",
        args,
      )
    ).rows[0].status,
    "created",
  );
  assert.equal(await consume(fresh), false);
  pass("resend cooldown is enforced and replacement revokes the earlier code");
  const trust = digest("trusted-device");
  await restricted.query(
    "insert into private.trusted_email_devices(token_hash,actor) values($1,$2)",
    [trust, user],
  );
  await owner.query(
    "update public.identity_accounts set password=password||'synthetic-invalidated' where \"userId\"=$1",
    [user],
  );
  assert.equal(
    (
      await restricted.query(
        "select 1 from private.trusted_email_devices where actor=$1",
        [user],
      )
    ).rowCount,
    0,
  );
  pass("password changes revoke remembered-device trust");
  const session = randomUUID();
  await owner.query(
    'insert into public.identity_sessions(id,"userId",token,"expiresAt","createdAt","updatedAt","mfaVerified") values($1,$2,$3,now()+interval \'1 hour\',now(),now(),false)',
    [session, user, randomBytes(32).toString("hex")],
  );
  assert.equal(
    (
      await owner.query(
        'select "emailOtpVerified" from public.identity_sessions where id=$1',
        [session],
      )
    ).rows[0].emailOtpVerified,
    false,
  );
  pass("new sessions start without email verification assurance");
  await owner.query(
    'update public.identity_sessions set "otpPolicyRequired"=true where id=$1',
    [session],
  );
  await assert.rejects(() =>
    restricted.query("select private.close_own_account($1)", [session]),
  );
  await owner.query(
    'update public.identity_sessions set "emailOtpVerified"=true where id=$1',
    [session],
  );
  await restricted.query("select private.close_own_account($1)", [session]);
  assert.equal(
    (
      await owner.query("select active from public.profiles where id=$1", [
        user,
      ])
    ).rows[0].active,
    false,
  );
  pass("account closure disables access without deleting audit history");
  console.log(`${count} OTP security checks passed`);
} finally {
  if (user) {
    await owner.query("update public.profiles set active=false where id=$1", [
      user,
    ]);
    await owner.query(
      'delete from public.identity_sessions where "userId"=$1',
      [user],
    );
  }
  await Promise.all([restricted.end(), app.end(), close()]);
}
