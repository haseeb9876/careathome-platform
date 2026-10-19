import { expect, type Page, type Locator } from "@playwright/test";
import { createDecipheriv, createHmac } from "node:crypto";
import { loadEnvFile } from "node:process";
import { Pool } from "pg";
export function otpTestPool() {
  loadEnvFile(".env.neon");
  const url = new URL(process.env.DATABASE_MIGRATION_URL!);
  if (
    url.hostname !==
      "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
    url.pathname !== "/careathome"
  )
    throw new Error("Unexpected test database");
  url.search = "";
  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });
}
export async function readTestCode(pool: Pool, email: string, id: string) {
  const rows = (
    await pool.query(
      "select payload_encrypted from private.development_email where recipient=$1 order by created_at desc limit 20",
      [email],
    )
  ).rows;
  const challenge = (
    await pool.query(
      "select code_hash from private.email_challenges where id=$1",
      [id],
    )
  ).rows[0];
  for (const row of rows) {
    const payload = Buffer.from(row.payload_encrypted, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.BETTER_AUTH_SECRET!.slice(0, 64), "hex"),
      payload.subarray(0, 12),
    );
    decipher.setAuthTag(payload.subarray(12, 28));
    const data = JSON.parse(
      Buffer.concat([
        decipher.update(payload.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
    const code = data.text?.match(/verification code is: (\d{6})/)?.[1];
    if (
      code &&
      createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(`${id}:${code}`)
        .digest("hex") === challenge?.code_hash
    )
      return code as string;
  }
  throw new Error("Synthetic OTP message not found");
}
async function ageFixtureRequests(pool: Pool, email: string) {
  if (
    !/^(otp-ui-|admin-ui-|invited-admin-ui-|security-ui-|changed-security-ui-)/.test(
      email,
    ) ||
    !email.endsWith("@careathome.test")
  )
    throw new Error(
      "Only isolated synthetic OTP fixtures may accelerate cooldowns",
    );
  // Keep production limits unchanged. Age only this disposable fixture's requests.
  await pool.query(
    "update private.email_challenges set created_at=now()-interval '61 minutes' where email=$1",
    [email],
  );
}
export async function fillEmailCode(form: Locator, pool: Pool, email: string) {
  await ageFixtureRequests(pool, email);
  if (!(await form.locator('[data-auto-send="true"]').count())) {
    await form
      .getByRole("button", {
        name: /^(Send verification code|Send a new code)$/,
      })
      .click();
  }
  const hidden = form.locator('input[name="otp_id"]');
  await expect(hidden).not.toHaveValue("");
  let code = "";
  await expect
    .poll(
      async () => {
        try {
          code = await readTestCode(pool, email, await hidden.inputValue());
          return true;
        } catch {
          return false;
        }
      },
      { timeout: 30000, intervals: [500, 1000] },
    )
    .toBe(true);
  await form.getByLabel("Six-digit email code", { exact: true }).fill(code);
}
export async function verifyEmailGate(
  page: Page,
  pool: Pool,
  email: string,
  remember = false,
) {
  const session = await (
    await page.request.get("/api/auth/get-session")
  ).json();
  if (session?.session?.emailOtpVerified) {
    await page.goto("/dashboard");
    return;
  }
  // Auto-send can run before fillEmailCode; prepare the fixture before navigation.
  await ageFixtureRequests(pool, email);
  await page.goto("/auth/email-code");
  const form = page.locator("form").filter({
    has: page.getByRole("button", {
      name: "Verify and continue",
      exact: true,
    }),
  });
  await fillEmailCode(form, pool, email);
  if (remember)
    await form.getByLabel("Remember this private device for 30 days").check();
  await form
    .getByRole("button", { name: "Verify and continue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
