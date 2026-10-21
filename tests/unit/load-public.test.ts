import { describe, expect, it } from "vitest";
// @ts-expect-error Operational script is intentionally executable JavaScript.
import { loadConfiguration, runLoad } from "../../scripts/load-public.mjs";

describe("bounded staging capacity runner", () => {
  it("refuses production aliases, unapproved remote hosts and unsafe limits", () => {
    for (const env of [
      {
        LOAD_BASE_URL: "https://careathome-platform.vercel.app",
        LOAD_ALLOW_STAGING_ORIGIN: "https://careathome-platform.vercel.app",
      },
      { LOAD_BASE_URL: "https://other.example" },
      { LOAD_BASE_URL: "http://user:password@localhost" },
      { LOAD_CONCURRENCY: "21" },
      { LOAD_REQUESTS: "1001" },
    ])
      expect(() => loadConfiguration(env)).toThrow();
    expect(
      loadConfiguration({
        LOAD_BASE_URL: "https://staging.example",
        LOAD_ALLOW_STAGING_ORIGIN: "https://staging.example",
      }).origin,
    ).toBe("https://staging.example");
  });
  it("counts failures, uses GET-only allowlisted paths and caps concurrent work", async () => {
    let active = 0,
      maximum = 0,
      count = 0;
    const report = await runLoad(
      {
        origin: "http://localhost:3000",
        concurrency: 2,
        requests: 8,
        timeoutMs: 1000,
        p95LimitMs: 1000,
      },
      async (url: string, options: RequestInit) => {
        expect(["/", "/services", "/providers", "/api/health"]).toContain(
          new URL(url).pathname,
        );
        expect(options.method).toBeUndefined();
        active++;
        maximum = Math.max(active, maximum);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return new Response("synthetic", { status: ++count === 1 ? 503 : 200 });
      },
    );
    expect(maximum).toBe(2);
    expect(report.requests).toBe(8);
    expect(report.failures).toBe(1);
    expect(report.passed).toBe(false);
  });
});
