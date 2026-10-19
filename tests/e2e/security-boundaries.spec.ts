import { expect, test } from "@playwright/test";

test("rejects oversized public requests and foreign share origins", async ({
  request,
}) => {
  const auth = await request.post("/api/auth/sign-in/email", {
    data: "x".repeat(8193),
  });
  expect(auth.status()).toBe(413);
  const share = await request.post("/api/share", { data: "x".repeat(1025) });
  expect(share.status()).toBe(413);
  const foreign = await request.post("/api/share", {
    headers: { origin: "https://untrusted.example" },
    data: { token: "a".repeat(64) },
  });
  expect(foreign.status()).toBe(403);
});

test("serves browser restrictions and keeps sessions uncached", async ({
  request,
}) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(home.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(home.headers()["content-security-policy"]).toContain(
    "form-action 'self'",
  );
  expect(home.headers()["permissions-policy"]).toContain("camera=()");
  const worker = await request.get("/sw.js");
  expect(worker.headers()["content-security-policy"]).toContain(
    "script-src 'self'",
  );
  const session = await request.get("/api/auth/get-session");
  expect(session.status()).toBe(200);
  expect(session.headers()["cache-control"]).toContain("no-store");
});
