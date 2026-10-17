import { test, expect } from "@playwright/test";

test("install manifest, icons and worker headers are published", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    short_name: "CareAtHome",
    display: "standalone",
    start_url: "/dashboard",
    scope: "/",
  });
  for (const icon of manifest.icons) {
    const file = await request.get(icon.src);
    expect(file.headers()["content-type"]).toContain("image/png");
    expect((await file.body()).subarray(1, 4).toString()).toBe("PNG");
  }
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
  const version = await request.get("/api/app-version");
  expect(typeof (await version.json()).version).toBe("string");
  expect(version.headers()["cache-control"]).toContain("no-store");
});

test("iPhone guidance appears on first visit, remembers dismissal and can reopen", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", { value: "iPhone" }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const card = page.getByRole("complementary", {
    name: "Your care, one tap away",
  });
  await expect(card).toContainText("Add to Home Screen");
  await expect(card).toContainText("Open as Web App");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.reload();
  await expect(card).toHaveCount(0);
  await page
    .getByRole("button", { name: "Install CareAtHome", exact: true })
    .click();
  await expect(card).toBeVisible();
});

test("native install is invoked only after a user click and installed mode hides guidance", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your care, one tap away" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.installInvoked = "yes";
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-install-invoked",
    "yes",
  );
  await page.getByRole("button", { name: "Install app", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-install-invoked",
    "yes",
  );
  await expect(
    page.getByRole("heading", { name: "Your care, one tap away" }),
  ).toHaveCount(0);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { value: true }),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Install CareAtHome", exact: true }),
  ).toHaveCount(0);
});

test("offline navigation uses only the public fallback and reconnects", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/dashboard?offline-check=1");
  await expect(
    page.getByRole("heading", { name: "Connect to continue your care" }),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (key) =>
          (await (await caches.open(key)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(cached.sort()).toEqual(["/icons/app-192.png", "/offline.html"]);
  await context.setOffline(false);
  await page.getByRole("link", { name: "Try again" }).click();
  await expect(page).toHaveURL(/auth/);
});

test("release detection offers refresh without clearing an unfinished form", async ({
  page,
}) => {
  let released = false;
  await page.route("**/api/app-version", async (route) => {
    if (released)
      await route.fulfill({ json: { version: "synthetic-new-release" } });
    else await route.continue();
  });
  await page.goto("/auth");
  await page.getByLabel("Email address").fill("unfinished@careathome.test");
  released = true;
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    page.getByRole("button", { name: "Refresh to update" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue(
    "unfinished@careathome.test",
  );
  await expect(
    page.getByRole("complementary", { name: "Application update" }),
  ).toContainText("Unsaved entries will be lost");
});
