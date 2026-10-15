import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
test("administrator reviews a persisted patient request", async ({ page }) => {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("Local Supabase required.");
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const password = "Synthetic-" + randomUUID();
  const suffix = randomUUID().slice(0, 8);
  const { data: adminData, error: adminError } =
    await admin.auth.admin.createUser({
      email: "admin-browser-" + suffix + "@careathome.test",
      password,
      email_confirm: true,
      user_metadata: { name: "Browser Admin", role: "patient" },
    });
  expect(adminError).toBeNull();
  const provision = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", adminData.user!.id);
  expect(provision.error).toBeNull();
  const email = "patient-admin-test-" + suffix + "@careathome.test";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Queue Patient", role: "patient" },
  });
  expect(created.error).toBeNull();
  const patient = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const login = await patient.auth.signInWithPassword({ email, password });
  expect(login.error).toBeNull();
  const address = "Synthetic queue fixture " + suffix;
  const requested = await patient.rpc("request_booking", {
    p_service: "10000000-0000-4000-8000-000000000001",
    p_start: new Date(Date.now() + 96 * 3600000).toISOString(),
    p_address: address,
    p_area: "Peshawar",
    p_request_key: randomUUID(),
  });
  expect(requested.error).toBeNull();
  await page.goto("/auth");
  await page
    .getByLabel("Email address")
    .fill("admin-browser-" + suffix + "@careathome.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("CARE OPERATIONS")).toBeVisible();
  await page.goto("/dashboard/bookings/" + requested.data);
  const card = page;
  await card.getByRole("button", { name: "Move to assignment queue" }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await expect(
    page.getByText("Pending Assignment", { exact: true }).first(),
  ).toBeVisible();
  const persisted = await patient
    .from("bookings")
    .select("status")
    .eq("id", requested.data)
    .single();
  expect(persisted.data?.status).toBe("Pending Assignment");
});
