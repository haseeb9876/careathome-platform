import { test, expect } from "@playwright/test";
for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
]) {
  test("public pages fit " + viewport.width, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "A little closer",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Find your care", exact: true })
      .click();
    await expect(page).toHaveURL(/services/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "A little support",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "My care space", exact: false })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Good to see you again" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("unauthenticated workspace redirects to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/auth/);
});

test("provider search explains invalid filters and offers a reset", async ({
  page,
}) => {
  await page.goto("/providers?price=-1&start=2027-02-30T12%3A00");
  await expect(
    page.getByRole("alert").filter({ hasText: "Check your filters" }),
  ).toContainText("Check your filters");
  await expect(
    page.getByText("0 verified professionals match your search."),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.getByRole("status")).toHaveText(
    /\d+ verified professionals? match(?:es)? your search\./,
  );
});
