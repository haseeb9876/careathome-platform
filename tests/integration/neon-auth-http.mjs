import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

const origin = "http://127.0.0.1:3000";
const url = new URL(
  process.env.DATABASE_MIGRATION_URL ?? "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Unexpected authentication-test target");
url.search = "";
const owner = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
});
const cookies = new Map();
async function call(path, body) {
  const response = await fetch(origin + "/api/auth" + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      "content-type": "application/json",
      cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0],
      at = pair.indexOf("=");
    cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return { status: response.status, data: await response.json() };
}
const email = `http-auth-${randomBytes(8).toString("hex")}@careathome.test`;
const password = randomBytes(24).toString("hex");
let id;
try {
  const signup = await call("/sign-up/email", {
    email,
    password,
    name: "Synthetic security test",
    accountType: "patient",
    emailOtpVerified: true,
    otpPolicyRequired: false,
    mfaVerified: true,
  });
  assert.equal(signup.status, 200);
  id = signup.data.user.id;
  assert.equal((await call("/get-session")).data, null);
  console.log("PASS registration does not silently create a session");
  assert.equal(
    (
      await call("/sign-in/email", {
        email,
        password,
        emailOtpVerified: true,
        otpPolicyRequired: false,
        mfaVerified: true,
      })
    ).status,
    200,
  );
  const session = (await call("/get-session")).data.session;
  assert.equal(session.emailOtpVerified, false);
  assert.equal(session.otpPolicyRequired, true);
  assert.equal(session.mfaVerified, false);
  console.log(
    "PASS client input cannot forge email or authenticator assurance",
  );
  for (const path of [
    "/change-password",
    "/change-email",
    "/update-user",
    "/delete-user",
    "/request-password-reset",
    "/reset-password",
    "/two-factor/enable",
    "/two-factor/disable",
    "/two-factor/generate-backup-codes",
    "/revoke-session",
    "/revoke-sessions",
  ]) {
    assert.equal((await call(path, { password, email })).status, 403);
  }
  console.log(
    "PASS sensitive public authentication endpoints cannot bypass OTP actions",
  );
  const response = await fetch(
    origin + "/api/reports/00000000-0000-0000-0000-000000000000/pdf",
    {
      headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
    },
  );
  assert.equal(response.status, 401);
  console.log("PASS an email-unverified session cannot access private reports");
  await call("/sign-out", {});
  assert.equal((await call("/get-session")).data, null);
  console.log("PASS sign-out invalidates the session");
} finally {
  if (id)
    await owner.query("update public.profiles set active=false where id=$1", [
      id,
    ]);
  await owner.end();
}
