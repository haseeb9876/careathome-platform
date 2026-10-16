import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("provider uploads a full 5 MiB private credential and rejects disguised content", async ({
  page,
}) => {
  test.setTimeout(240000);
  const password = readFileSync(".env.demo", "utf8").trim().split("=")[1];
  await page.goto("/auth");
  await page.getByLabel("Email address").fill("provider@careathome.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/dashboard/profile");
  const label = "Synthetic hosted credential " + Date.now();
  await page.getByLabel("Document label").fill(label);
  await page
    .getByLabel("Expiry date", { exact: true })
    .fill(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  const bytes = Buffer.alloc(5 * 1024 * 1024, 32);
  bytes.write("%PDF-1.4\nSynthetic maximum-size transfer check\n%%EOF");
  await page.getByLabel("PDF, JPEG or PNG").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: bytes,
  });
  await page
    .getByRole("button", { name: "Upload credential", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Credential submitted for review",
    { timeout: 120000 },
  );
  const item = page.locator(".activity-item").filter({ hasText: label });
  await expect(item).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await item.getByRole("link", { name: /Open private document/ }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
  await page.getByLabel("Document label").fill("Rejected disguised document");
  await page
    .getByLabel("Expiry date", { exact: true })
    .fill(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  await page.getByLabel("PDF, JPEG or PNG").setInputFiles({
    name: "disguised.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("This is not a PDF"),
  });
  await page
    .getByRole("button", { name: "Upload credential", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "File content does not match",
  );
});
