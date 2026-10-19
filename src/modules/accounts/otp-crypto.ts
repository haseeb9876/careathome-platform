import { createHmac, randomInt, randomUUID } from "node:crypto";

export function otpDigest(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function newOtp(secret: string) {
  const id = randomUUID();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  return { id, code, hash: otpDigest(`${id}:${code}`, secret) };
}
export function operationDigest(
  purpose: string,
  values: Record<string, string>,
  secret: string,
) {
  return otpDigest(
    JSON.stringify([
      purpose,
      Object.entries(values).sort(([a], [b]) => a.localeCompare(b)),
    ]),
    secret,
  );
}
