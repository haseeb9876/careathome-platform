import { finishSyntheticSignIn } from "./otp-helpers";
import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("patient registers, requests, saves profile, cancels and signs out", async ({
  page,
}) => {
  const email = "browser-" + Date.now() + "@careathome.test";
  await page.goto("/auth?mode=register");
  await page.getByLabel("Full name").fill("Browser Patient");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("SyntheticOnlyPass123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/auth\/email-code$/);
  await finishSyntheticSignIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Hello, Browser.",
  );
  await page.goto("/dashboard/new");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Date and time")
    .fill(new Date(Date.now() + 96 * 3600000).toISOString().slice(0, 16));
  await page.getByLabel("Service area", { exact: true }).fill("Peshawar");
  await page
    .getByLabel("Visit address", { exact: true })
    .fill("Synthetic browser test address");
  await page.getByLabel("Date and time").fill("2020-01-01T10:00");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "future date" }),
  ).toContainText("future date");
  await expect(page.getByLabel("Visit address", { exact: true })).toHaveValue(
    "Synthetic browser test address",
  );
  await page
    .getByLabel("Date and time")
    .fill(new Date(Date.now() + 96 * 3600000).toISOString().slice(0, 16));
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // A service can become unavailable between selection and submission.
  const selectedService = page.locator('input[name="service"]:checked');
  const realService = await selectedService.inputValue();
  await selectedService.evaluate((input: HTMLInputElement) => {
    input.value = "10000000-0000-4000-8000-000000000099";
  });
  await page.getByRole("button", { name: "Send visit request" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "could not save" }),
  ).toContainText("could not save");
  await page.getByRole("button", { name: "Check visit details" }).click();
  await expect(page.getByLabel("Visit address", { exact: true })).toHaveValue(
    "Synthetic browser test address",
  );
  await selectedService.evaluate((input: HTMLInputElement, value) => {
    input.value = value;
  }, realService);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Send visit request" }).click();
  await expect(page.getByRole("status")).toContainText("Request saved");
  await expect(
    page.getByText("Requested", { exact: true }).first(),
  ).toBeVisible();
  const visitUrl = page.url();
  await page.goto("/dashboard/profile");
  await page.getByLabel("Full name").fill("Updated Patient");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Hello, Updated.",
  );
  await page.goto(visitUrl);
  await page.getByText("Cancel this visit", { exact: true }).click();
  await page
    .getByLabel("Cancellation reason", { exact: true })
    .fill("Synthetic test cancellation");
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(
    page.getByText("Cancelled", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/auth/);
});
test("provider registers as Pending", async ({ page }) => {
  await page.goto("/auth?mode=register");
  const email = "provider-browser-" + Date.now() + "@careathome.test";
  await page.getByLabel("Full name").fill("Browser Nurse");
  await page.getByLabel("Account type").selectOption("provider");
  await page.getByLabel("Provider profession").selectOption("nurse");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("SyntheticOnlyPass123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/auth\/email-code$/);
  await finishSyntheticSignIn(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard/profile");
  await expect(
    page.getByText("Pending", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Professional profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit visit request" }),
  ).toHaveCount(0);
});
