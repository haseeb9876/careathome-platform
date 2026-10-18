import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
const origin = "http://127.0.0.1:3000";
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
  const data = await response.json();
  return { status: response.status, data };
}
function totp(uri) {
  const secret = new URL(uri).searchParams.get("secret");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase()]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest(),
    offset = hash[19] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
const email = `http-auth-${randomBytes(6).toString("hex")}@careathome.test`,
  password = randomBytes(24).toString("hex");
assert.equal(
  (
    await call("/sign-up/email", {
      email,
      password,
      name: "Synthetic security test",
      accountType: "patient",
    })
  ).status,
  200,
);
assert.equal((await call("/get-session")).data, null);
console.log("PASS registration does not silently create a session");
assert.equal((await call("/sign-in/email", { email, password })).status, 200);
assert.equal((await call("/get-session")).data.session.mfaVerified, false);
console.log("PASS password-only session has no MFA assurance");
const enabled = await call("/two-factor/enable", { password });
assert.equal(enabled.status, 200);
assert.ok(enabled.data.totpURI);
assert.ok(enabled.data.backupCodes.length);
assert.equal(
  (await call("/two-factor/verify-totp", { code: totp(enabled.data.totpURI) }))
    .status,
  200,
);
assert.equal((await call("/get-session")).data.session.mfaVerified, true);
console.log(
  "PASS authenticator enrollment requires a valid code and upgrades the session",
);
await call("/sign-out", {});
assert.equal((await call("/get-session")).data, null);
console.log("PASS sign-out invalidates session");
const login = await call("/sign-in/email", { email, password });
assert.equal(
  login.status,
  200,
  `MFA login response: ${login.data.code ?? login.status}`,
);
assert.equal(login.data.twoFactorRedirect, true);
assert.equal((await call("/get-session")).data, null);
console.log("PASS password alone cannot open a session after MFA enrollment");
assert.notEqual(
  (await call("/two-factor/verify-totp", { code: "invalid" })).status,
  200,
);
assert.equal((await call("/get-session")).data, null);
assert.equal(
  (await call("/two-factor/verify-totp", { code: totp(enabled.data.totpURI) }))
    .status,
  200,
);
assert.equal((await call("/get-session")).data.session.mfaVerified, true);
console.log(
  "PASS MFA rejects invalid input and accepts a current authenticator code",
);
await call("/sign-out", {});
await call("/sign-in/email", { email, password });
assert.equal(
  (
    await call("/two-factor/verify-backup-code", {
      code: enabled.data.backupCodes[0],
    })
  ).status,
  200,
);
assert.equal((await call("/get-session")).data.session.mfaVerified, true);
console.log("PASS recovery code completes MFA with verified assurance");
await call("/sign-out", {});
const wrong = {
  email: `rate-${randomBytes(4).toString("hex")}@careathome.test`,
  password,
};
for (let i = 0; i < 5; i++) await call("/sign-in/email", wrong);
assert.equal((await call("/sign-in/email", wrong)).status, 429);
console.log("PASS repeated login attempts are persistently limited");
