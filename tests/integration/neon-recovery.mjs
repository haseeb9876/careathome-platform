import assert from "node:assert/strict";
import { randomBytes, createDecipheriv } from "node:crypto";
import { Pool } from "pg";
const origin = "http://127.0.0.1:3000";
const url = new URL(
  process.env.DATABASE_MIGRATION_URL ?? "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Unexpected recovery-test target");
url.search = "";
const owner = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
});
const email = `recovery-${randomBytes(6).toString("hex")}@careathome.test`,
  password = randomBytes(24).toString("hex"),
  replacement = randomBytes(24).toString("hex");
async function call(path, body, cookie = "") {
  const r = await fetch(origin + "/api/auth" + path, {
    method: body ? "POST" : "GET",
    headers: { origin, "content-type": "application/json", cookie },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  };
}
try {
  assert.equal(
    (
      await call("/sign-up/email", {
        email,
        password,
        name: "Synthetic recovery test",
        accountType: "patient",
      })
    ).status,
    200,
  );
  const login = await call("/sign-in/email", { email, password });
  assert.equal(login.status, 200);
  assert.equal(
    (
      await call("/request-password-reset", {
        email,
        redirectTo: origin + "/auth/password",
      })
    ).status,
    200,
  );
  const row = (
    await owner.query(
      "select payload_encrypted from private.development_email where recipient=$1 order by created_at desc limit 1",
      [email],
    )
  ).rows[0];
  assert.ok(row);
  assert.ok(!row.payload_encrypted.includes(email));
  const payload = Buffer.from(row.payload_encrypted, "base64");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.BETTER_AUTH_SECRET.slice(0, 64), "hex"),
    payload.subarray(0, 12),
  );
  decipher.setAuthTag(payload.subarray(12, 28));
  const message = JSON.parse(
    Buffer.concat([
      decipher.update(payload.subarray(28)),
      decipher.final(),
    ]).toString(),
  );
  const link = new URL(message.url);
  const response = await fetch(link, { redirect: "manual" });
  const token = new URL(response.headers.get("location")).searchParams.get(
    "token",
  );
  assert.ok(token);
  console.log(
    "PASS password recovery is captured encrypted in development inbox",
  );
  assert.equal(
    (await call("/reset-password", { token, newPassword: replacement })).status,
    200,
  );
  assert.equal(
    (await call("/get-session", undefined, login.cookie)).data,
    null,
  );
  console.log("PASS password reset revokes existing sessions");
  assert.notEqual(
    (await call("/reset-password", { token, newPassword: password })).status,
    200,
  );
  assert.notEqual(
    (await call("/sign-in/email", { email, password })).status,
    200,
  );
  assert.equal(
    (await call("/sign-in/email", { email, password: replacement })).status,
    200,
  );
  console.log(
    "PASS recovery token is single-use and only the new password works",
  );
} finally {
  await owner.end();
}
