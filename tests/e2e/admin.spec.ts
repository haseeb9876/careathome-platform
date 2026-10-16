import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient, type QueryResult } from "pg";
import { withDatabaseIdentity } from "../../src/lib/database/transaction";
import { applicationDatabaseConfig } from "../../src/lib/database/config";

test("administrator reviews a persisted patient request", async ({ page }) => {
  process.loadEnvFile(".env.neon");
  const url = new URL(process.env.DATABASE_MIGRATION_URL!);
  if (
    url.hostname !==
      "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
    url.pathname !== "/careathome"
  )
    throw new Error("Unexpected synthetic test target");
  url.search = "";
  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });
  const password = "Synthetic-" + randomUUID(),
    suffix = randomUUID().slice(0, 8);
  async function signup(email: string, name: string) {
    const r = await page.request.post("/api/auth/sign-up/email", {
      data: { email, password, name, accountType: "patient" },
    });
    expect(r.ok()).toBeTruthy();
    return (await r.json()).user;
  }
  const administrator = await signup(
    "admin-browser-" + suffix + "@careathome.test",
    "Browser Admin",
  );
  const patient = await signup(
    "patient-admin-test-" + suffix + "@careathome.test",
    "Queue Patient",
  );
  const address = "Synthetic queue fixture " + suffix;
  let booking: string;
  const application = new Pool(applicationDatabaseConfig(process.env));
  try {
    await pool.query("update public.profiles set role='admin' where id=$1", [
      administrator.id,
    ]);
    const result = await withDatabaseIdentity<PoolClient, QueryResult>(
      application,
      { userId: patient.id, assurance: "aal1" },
      (c) =>
        c.query("select public.request_booking($1,$2,$3,'Peshawar',$4) as id", [
          "10000000-0000-4000-8000-000000000001",
          new Date(Date.now() + 96 * 3600000).toISOString(),
          address,
          randomUUID(),
        ]),
    );
    booking = result.rows[0].id;
  } finally {
    await pool.end();
    await application.end();
  }
  await page.goto("/auth");
  await page
    .getByLabel("Email address")
    .fill("admin-browser-" + suffix + "@careathome.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("CARE OPERATIONS")).toBeVisible();
  await page.goto("/dashboard/bookings/" + booking);
  const card = page;
  await card.getByRole("button", { name: "Move to assignment queue" }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await expect(
    page.getByText("Pending Assignment", { exact: true }).first(),
  ).toBeVisible();
  const verificationPool = new Pool(applicationDatabaseConfig(process.env));
  try {
    const persisted = await withDatabaseIdentity<PoolClient, QueryResult>(
      verificationPool,
      { userId: patient.id, assurance: "aal1" },
      (c) =>
        c.query("select status from public.bookings where id=$1", [booking]),
    );
    expect(persisted.rows[0]?.status).toBe("Pending Assignment");
  } finally {
    await verificationPool.end();
  }
});
