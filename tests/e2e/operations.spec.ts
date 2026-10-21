import { expect, test } from "@playwright/test";
test.use({ trace: "off" });

test("public uptime exposes no dependency credentials and readiness fails closed", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    status: "ok",
    service: "careathome",
    check: "liveness",
  });
  expect(response.headers()["cache-control"]).toContain("no-store");
  const attempts: Record<string, string>[] = [
    {},
    { authorization: "Bearer incorrect" },
  ];
  for (const headers of attempts) {
    const ready = await request.get("/api/health/ready", { headers });
    expect(ready.status()).toBe(401);
    expect(await ready.json()).toEqual({ error: "Not authorized" });
  }
});

test("unconfigured Android association grants no certificate trust", async ({
  request,
}) => {
  const response = await request.get("/.well-known/assetlinks.json");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
  expect(response.headers()["content-type"]).toContain("application/json");
});

test("authorized operator can check both restricted database connections", async ({
  request,
}) => {
  test.skip(
    !process.env.OPS_HEALTH_TOKEN,
    "Requires privately configured operator token",
  );
  const response = await request.get("/api/health/ready", {
    headers: { authorization: `Bearer ${process.env.OPS_HEALTH_TOKEN}` },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    status: "ok",
    checks: ["application_database", "authentication_database"],
  });
  expect(response.headers()["cache-control"]).toContain("no-store");
});
