import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes, createHmac } from "node:crypto";
import { symmetricDecrypt, parseEnvelope } from "better-auth/crypto";
import {
  otpTestPool,
  fillEmailCode,
  verifyEmailGate,
  readTestCode,
} from "./otp-helpers";
test.use({ trace: "off", actionTimeout: 20000 });
test("authenticator enrollment and recovery-code replacement require email OTP", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240000);
  const pool = otpTestPool();
  const email = `otp-ui-${randomBytes(8).toString("hex")}@careathome.test`,
    password = randomBytes(24).toString("hex");
  let id: string | undefined;
  try {
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: baseURL! },
      data: {
        email,
        password,
        name: "Synthetic MFA review",
        accountType: "patient",
      },
    });
    expect(signup.status()).toBe(200);
    id = (await signup.json()).user.id;
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await verifyEmailGate(page, pool, email);
    await page.goto("/dashboard/settings");
    const enroll = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Set up or verify authenticator",
        exact: true,
      }),
    });
    await enroll.getByLabel("Current password", { exact: true }).fill(password);
    await fillEmailCode(enroll, pool, email);
    await enroll
      .getByRole("button", {
        name: "Set up or verify authenticator",
        exact: true,
      })
      .click();
    const totpForm = page.locator("form").filter({
      has: page.getByLabel("Six-digit authenticator code", { exact: true }),
    });
    await expect(
      totpForm.getByLabel("Six-digit authenticator code", { exact: true }),
    ).toBeVisible();
    const record = (
      await pool.query(
        'select secret from public.identity_two_factors where "userId"=$1',
        [id],
      )
    ).rows[0];
    const secret = await symmetricDecrypt({
      key: process.env.BETTER_AUTH_SECRET!,
      data: parseEnvelope(record.secret)?.ciphertext ?? record.secret,
    });
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const hmac = createHmac("sha1", secret).update(counter).digest(),
      offset = hmac[19] & 15;
    const code = String(
      (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000,
    ).padStart(6, "0");
    await totpForm
      .getByLabel("Six-digit authenticator code", { exact: true })
      .fill(code);
    await totpForm
      .getByRole("button", { name: "Verify code", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Authenticator verified" }),
    ).toBeVisible();
    await page.goto("/dashboard/settings");
    await page
      .getByText("Recovery codes and authenticator changes", { exact: true })
      .click();
    const maintenance = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Confirm security change",
        exact: true,
      }),
    });
    await maintenance
      .getByLabel("Current password", { exact: true })
      .fill(password);
    await fillEmailCode(maintenance, pool, email);
    await maintenance
      .getByRole("button", { name: "Confirm security change", exact: true })
      .click();
    await expect(
      maintenance
        .getByRole("status")
        .filter({ hasText: "Store these new codes" }),
    ).toBeVisible();
    expect(
      (
        await pool.query(
          'select "twoFactorEnabled" from public.identity_users where id=$1',
          [id],
        )
      ).rows[0].twoFactorEnabled,
    ).toBe(true);
    expect(
      (
        await pool.query(
          "select 1 from public.audit_log where actor=$1 and action='authenticator_recovery_codes_updated'",
          [id],
        )
      ).rowCount,
    ).toBeGreaterThan(0);
  } finally {
    if (id) {
      await pool.query("update public.profiles set active=false where id=$1", [
        id,
      ]);
      await pool.query(
        'delete from public.identity_sessions where "userId"=$1',
        [id],
      );
    }
    await pool.end();
  }
});
test("email OTP gates new accounts, remembers devices and protects recovery", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(300000);
  const pool = otpTestPool();
  const email = `otp-ui-${randomBytes(8).toString("hex")}@careathome.test`;
  const password = randomBytes(24).toString("hex"),
    replacement = randomBytes(24).toString("hex");
  let id: string | undefined;
  try {
    const result = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: baseURL! },
      data: {
        email,
        password,
        name: "Synthetic OTP account",
        accountType: "patient",
      },
    });
    expect(result.status()).toBe(200);
    id = (await result.json()).user.id;
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/email-code$/);
    expect(
      (
        await page.request.post("/api/auth/change-password", {
          headers: { origin: baseURL! },
          data: { currentPassword: password, newPassword: replacement },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/auth/two-factor/disable", {
          headers: { origin: baseURL! },
          data: { password },
        })
      ).status(),
    ).toBe(403);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const form = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Verify and continue",
        exact: true,
      }),
    });
    await fillEmailCode(form, pool, email);
    const code = await form.getByLabel("Six-digit email code").inputValue();
    await form
      .getByLabel("Six-digit email code")
      .fill(code === "000000" ? "111111" : "000000");
    await form
      .getByRole("button", { name: "Verify and continue", exact: true })
      .click();
    await expect(form.getByRole("alert")).toContainText("incorrect");
    await form.getByLabel("Six-digit email code").fill(code);
    await form.getByLabel("Remember this private device for 30 days").check();
    await form
      .getByRole("button", { name: "Verify and continue", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(
      (
        await pool.query(
          'select "emailVerified" from public.identity_users where id=$1',
          [id],
        )
      ).rows[0].emailVerified,
    ).toBe(true);
    await page.request.post("/api/auth/sign-out", {
      headers: { origin: baseURL! },
      data: {},
    });
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.request.post("/api/auth/sign-out", {
      headers: { origin: baseURL! },
      data: {},
    });
    await page.goto("/auth/recovery");
    const recovery = page.locator("main form");
    await recovery.getByLabel("Email address").fill(email);
    await recovery
      .getByLabel("New password", { exact: true })
      .fill(replacement);
    await recovery
      .getByLabel("Confirm new password", { exact: true })
      .fill(replacement);
    await fillEmailCode(recovery, pool, email);
    const recoveryId = await recovery
      .locator('input[name="otp_id"]')
      .inputValue();
    expect(await readTestCode(pool, email, recoveryId)).toMatch(/^\d{6}$/);
    await recovery
      .getByRole("button", { name: "Reset password securely" })
      .click();
    await expect(page).toHaveURL(/\/auth\?message=/);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from private.trusted_email_devices where actor=$1",
          [id],
        )
      ).rows[0].n,
    ).toBe(0);
    await expect
      .poll(
        async () =>
          (
            await page.request.post("/api/auth/sign-in/email", {
              headers: { origin: baseURL! },
              data: { email, password: replacement },
            })
          ).status(),
        { timeout: 75000, intervals: [11000, 30000] },
      )
      .toBe(200);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/email-code$/);
    await verifyEmailGate(page, pool, email);
  } finally {
    if (id) {
      await pool.query("update public.profiles set active=false where id=$1", [
        id,
      ]);
      await pool.query(
        'delete from public.identity_sessions where "userId"=$1',
        [id],
      );
      await pool.query(
        "delete from private.trusted_email_devices where actor=$1",
        [id],
      );
    }
    await pool.end();
  }
});
