import { test, expect, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes, createDecipheriv } from "node:crypto";
import { loadEnvFile } from "node:process";
import { Pool } from "pg";
import { fillEmailCode, verifyEmailGate } from "./otp-helpers";

// Synthetic credentials and verification links must not be retained in traces.
test.use({ trace: "off", actionTimeout: 20000 });
async function signIn(
  request: APIRequestContext,
  origin: string,
  email: string,
  password: string,
) {
  // Respect Better Auth's three-request/ten-second IP limit during rapid flows.
  await expect
    .poll(
      async () => {
        const response = await request.post("/api/auth/sign-in/email", {
          headers: { origin },
          data: { email, password },
        });
        const status = response.status();
        if (status !== 200 && status !== 429)
          throw new Error(`Sign-in failed with status ${status}`);
        return status;
      },
      { timeout: 75000, intervals: [11000, 11000, 30000] },
    )
    .toBe(200);
}
test("administrator invitation screens enforce MFA and activate a separate invited account", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(300000);
  loadEnvFile(".env.neon");
  const url = new URL(process.env.DATABASE_MIGRATION_URL!);
  if (
    url.hostname !==
      "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
    url.pathname !== "/careathome"
  )
    throw new Error("Unexpected test database");
  url.search = "";
  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });
  const email = `admin-ui-${randomBytes(8).toString("hex")}@careathome.test`;
  const inviteEmail = `invited-${email}`;
  const password = randomBytes(24).toString("hex");
  const invitedPassword = randomBytes(24).toString("hex");
  const inviteContext = await browser.newContext({ baseURL });
  try {
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: baseURL! },
      data: {
        email,
        password,
        name: "Synthetic invitation sender",
        accountType: "patient",
      },
    });
    expect(signup.status()).toBe(200);
    const id = (await signup.json()).user.id;
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await pool.query("update public.profiles set role='admin' where id=$1", [
      id,
    ]);
    await signIn(page.request, baseURL!, email, password);
    await verifyEmailGate(page, pool, email);
    await page.goto("/dashboard/users");
    const form = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Send administrator invitation",
        exact: true,
      }),
    });
    await form.getByLabel("Administrator email").fill(inviteEmail);
    await form.getByLabel("Current password", { exact: true }).fill(password);
    await form
      .getByRole("button", {
        name: "Send verification code",
        exact: true,
      })
      .click();
    await expect(form.getByRole("alert")).toContainText("two-step");
    // Fixture establishes MFA state; real TOTP verification is covered by test:auth.
    await pool.query(
      'update public.identity_users set "twoFactorEnabled"=true where id=$1',
      [id],
    );
    await pool.query(
      'update public.identity_sessions set "mfaVerified"=true where "userId"=$1',
      [id],
    );
    await page.reload();
    await form.getByLabel("Administrator email").fill(inviteEmail);
    await form.getByLabel("Current password", { exact: true }).fill(password);
    await fillEmailCode(form, pool, email);
    await form
      .getByRole("button", {
        name: "Send administrator invitation",
        exact: true,
      })
      .click();
    await expect(
      form.getByRole("status").filter({ hasText: "Recorded in" }),
    ).toBeVisible();
    const row = (
      await pool.query(
        "select payload_encrypted from private.development_email where recipient=$1 order by created_at desc limit 1",
        [inviteEmail],
      )
    ).rows[0];
    const payload = Buffer.from(row.payload_encrypted, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.BETTER_AUTH_SECRET!.slice(0, 64), "hex"),
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
    const invited = await inviteContext.newPage();
    await invited.goto(link.pathname + link.hash);
    await invited
      .getByLabel("Full name")
      .fill("Synthetic invited administrator");
    await invited
      .getByLabel("New password", { exact: true })
      .fill(invitedPassword);
    await invited
      .getByLabel("Confirm new password", { exact: true })
      .fill(invitedPassword);
    await fillEmailCode(invited.locator("main form"), pool, inviteEmail);
    await invited
      .getByRole("button", {
        name: "Accept administrator invitation",
        exact: true,
      })
      .click();
    await expect(invited).toHaveURL(/\/auth\?message=/);
    expect(
      (
        await inviteContext.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email: inviteEmail, password: invitedPassword },
        })
      ).status(),
    ).toBe(200);
    await verifyEmailGate(invited, pool, inviteEmail);
    await invited.goto("/dashboard/users");
    await expect(
      invited.getByRole("heading", { name: "Invite an administrator" }),
    ).toBeVisible();
    await invited.goto(link.pathname + link.hash);
    await expect(invited.locator("main").getByRole("alert")).toContainText(
      /invalid|expired|used/i,
    );
  } finally {
    const ids = (
      await pool.query(
        "select id from public.identity_users where email=any($1::text[])",
        [[email, inviteEmail]],
      )
    ).rows.map((row) => row.id);
    await pool.query(
      "update public.profiles set active=false where id=any($1::uuid[])",
      [ids],
    );
    await pool.query(
      'delete from public.identity_sessions where "userId"=any($1::uuid[])',
      [ids],
    );
    await inviteContext.close();
    await pool.end();
  }
});
test("password and verified email changes retire sessions and preserve account access", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(300000);
  loadEnvFile(".env.neon");
  const url = new URL(process.env.DATABASE_MIGRATION_URL!);
  if (
    url.hostname !==
      "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
    url.pathname !== "/careathome"
  )
    throw new Error("Unexpected test database");
  url.search = "";
  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });
  const email = `security-ui-${randomBytes(8).toString("hex")}@careathome.test`;
  const nextEmail = `changed-${email}`;
  const password = randomBytes(24).toString("hex");
  const replacement = randomBytes(24).toString("hex");
  const second = await browser.newContext({ baseURL });
  let userId: string | undefined;
  try {
    const signup = await page.request.post("/api/auth/sign-up/email", {
      headers: { origin: baseURL! },
      data: {
        email,
        password,
        name: "Synthetic security review",
        accountType: "patient",
      },
    });
    expect(signup.status()).toBe(200);
    userId = (await signup.json()).user.id;
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await second.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await verifyEmailGate(page, pool, email);
    await page.goto("/auth/password");
    await page
      .getByLabel("Current password", { exact: true })
      .fill("wrong-password-for-test");
    await page.getByLabel("New password", { exact: true }).fill(replacement);
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(replacement);
    await page.getByRole("button", { name: "Send verification code" }).click();
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
    await page.getByLabel("Current password", { exact: true }).fill(password);
    await page.getByLabel("New password", { exact: true }).fill(replacement);
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill(replacement);
    await fillEmailCode(page.locator("main form"), pool, email);
    await page
      .getByRole("button", { name: "Change password and sign out" })
      .click();
    await expect(page).toHaveURL(/\/auth\?message=/);
    expect(
      await (await second.request.get("/api/auth/get-session")).json(),
    ).toBeNull();
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password },
        })
      ).status(),
    ).not.toBe(200);
    await signIn(page.request, baseURL!, email, replacement);
    await verifyEmailGate(page, pool, email);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/settings");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const form = page.locator("form").filter({
      has: page.getByRole("button", {
        name: "Send verification email",
        exact: true,
      }),
    });
    await form.getByLabel("New email address").fill(nextEmail);
    await form
      .getByLabel("Current password", { exact: true })
      .fill(replacement);
    await fillEmailCode(form, pool, email);
    await form
      .getByRole("button", { name: "Send verification email", exact: true })
      .click();
    await expect(
      form.getByRole("status").filter({ hasText: "Recorded in" }),
    ).toBeVisible();
    expect(
      (
        await pool.query(
          "select email from public.identity_users where id=$1",
          [userId],
        )
      ).rows[0].email,
    ).toBe(email);
    const row = (
      await pool.query(
        "select payload_encrypted from private.development_email where recipient=$1 order by created_at desc limit 1",
        [nextEmail],
      )
    ).rows[0];
    const payload = Buffer.from(row.payload_encrypted, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.BETTER_AUTH_SECRET!.slice(0, 64), "hex"),
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
    await page.goto(link.pathname + link.hash);
    await page
      .getByLabel("Current password", { exact: true })
      .fill(replacement);
    await fillEmailCode(page.locator("main form"), pool, nextEmail);
    await page
      .getByRole("button", { name: "Verify email and sign out" })
      .click();
    await expect(page).toHaveURL(/\/auth\?message=/);
    await signIn(page.request, baseURL!, nextEmail, replacement);
    await verifyEmailGate(page, pool, nextEmail);
    await page.goto(link.pathname + link.hash);
    await expect(page.locator("main").getByRole("alert")).toContainText(
      /invalid|expired|used/i,
    );
  } finally {
    if (userId) {
      await pool.query("update public.profiles set active=false where id=$1", [
        userId,
      ]);
      await pool.query(
        'delete from public.identity_sessions where "userId"=$1',
        [userId],
      );
    }
    await second.close();
    await pool.end();
  }
});
