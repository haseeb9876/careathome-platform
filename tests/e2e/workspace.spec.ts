import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
const password = readFileSync(".env.demo", "utf8").trim().split("=")[1];
async function login(page: import("@playwright/test").Page, role: string) {
  await page.goto("/auth");
  await page.getByLabel("Email address").fill(role + "@careathome.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 90000 });
}
test("patient report review, PDF export, bearer sharing and revocation", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  await login(page, "patient");
  await page.goto("/dashboard/reports");
  const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    to = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel("From", { exact: true }).fill(from);
  await page.getByLabel("Through", { exact: true }).fill(to);
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByRole("status")).toContainText("Report created");
  await expect(
    page.getByText("DEMO / TEMPLATE SUMMARY.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I have reviewed these records" })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PDF" }).click();
  const file = await download;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).subarray(0, 5).toString()).toBe("%PDF-");
  await page
    .getByRole("button", { name: "Create private sharing link" })
    .click();
  const url = await page.getByLabel("Your private link").inputValue();
  expect(url).toMatch(/\/share#[a-f0-9]{64}$/);
  const shared = await context.newPage();
  await shared.goto(url);
  await expect(
    shared.getByText("DEMO / TEMPLATE SUMMARY.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revoke access" }).last().click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await expect(page.getByText("Revoked", { exact: true }).last()).toBeVisible();
  await shared.reload();
  await expect(
    shared.getByRole("alert").filter({ hasText: "expired" }),
  ).toBeVisible();
  await shared.close();
});
for (const role of ["patient", "provider", "admin"])
  test(
    role + " workspace pages load and mobile navigation works",
    async ({ page }) => {
      test.setTimeout(300000);
      await login(page, role);
      const sections =
        role === "patient"
          ? [
              "bookings",
              "records",
              "reports",
              "payments",
              "reviews",
              "support",
              "notifications",
              "profile",
              "settings",
            ]
          : role === "provider"
            ? [
                "bookings",
                "schedule",
                "records",
                "reports",
                "reviews",
                "support",
                "notifications",
                "profile",
                "settings",
              ]
            : [
                "bookings",
                "providers",
                "users",
                "services",
                "payments",
                "reviews",
                "support",
                "notifications",
                "settings",
                "audit",
              ];
      for (const section of sections) {
        const response = await page.goto("/dashboard/" + section);
        expect(response?.status(), section).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(
          page.getByText("We couldn’t load this part of your workspace."),
        ).toHaveCount(0);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Workspace navigation" })
        .getByRole("link", { name: "Help & support" })
        .click();
      await expect(page).toHaveURL(/support/);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    },
  );
test("responsive visual evidence and accessibility of primary screens", async ({
  page,
}) => {
  test.setTimeout(300000);
  mkdirSync("test-results/visual", { recursive: true });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    await page.screenshot({
      path: "test-results/visual/home-" + width + ".png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const homeAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    homeAudit.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await login(page, "patient");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/dashboard");
    await page.screenshot({
      path: "test-results/visual/patient-" + width + ".png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
