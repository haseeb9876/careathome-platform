import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

async function openAppearance(page: Page) {
  await page
    .getByRole("button", { name: "Appearance settings", exact: true })
    .click();
  return page.getByRole("dialog");
}

test("appearance persists, synchronizes tabs and follows system without clearing forms", async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/auth");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Email address").fill("unfinished@example.test");
  const dialog = await openAppearance(page);
  await dialog.getByRole("button", { name: "Light", exact: true }).click();
  await dialog.getByLabel("Larger text").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-large-text", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Appearance settings", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Email address")).toHaveValue(
    "unfinished@example.test",
  );
  const second = await context.newPage();
  await second.goto("/services");
  await expect(second.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(second.locator("html")).toHaveAttribute(
    "data-large-text",
    "true",
  );
  await openAppearance(page);
  await dialog.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(second.locator("html")).toHaveAttribute("data-theme", "dark");
  await dialog.getByRole("button", { name: "System", exact: true }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-large-text", "true");
  await second.close();
});

test("appearance remains usable when browser storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Blocked");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/auth");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dialog = await openAppearance(page);
  await dialog.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(dialog.getByRole("status")).toContainText(
    "blocked saving preferences",
  );
});

test("dark public pages and appearance dialog are accessible at mobile and desktop sizes", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.emulateMedia({ colorScheme: "dark" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services", "/providers", "/auth"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    const dialog = await openAppearance(page);
    await dialog.getByLabel("Larger text").check();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/visual/appearance-${width}.png`,
    });
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/");
  await page.screenshot({
    path: "test-results/visual/home-dark.png",
    fullPage: true,
  });
});

for (const role of ["patient", "provider", "admin"]) {
  test(`${role} dark workspace and reading settings`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/auth");
    const password = readFileSync(".env.demo", "utf8").trim().split("=")[1];
    await page.getByLabel("Email address").fill(`${role}@careathome.test`);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 90000 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.goto("/dashboard/settings");
    await page.locator("main").getByLabel("Larger text").check();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/visual/${role}-dark-settings.png`,
      fullPage: true,
    });
    const dialog = await openAppearance(page);
    await expect(dialog.getByLabel("Larger text")).toBeChecked();
    await dialog.getByRole("button", { name: "Light", exact: true }).click();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(
      page.locator("main").getByRole("button", { name: "Light", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
}
