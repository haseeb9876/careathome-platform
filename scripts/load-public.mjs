import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function loadConfiguration(env) {
  const target = new URL(env.LOAD_BASE_URL ?? "http://127.0.0.1:3000");
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname);
  if (
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname !== "/" ||
    !["http:", "https:"].includes(target.protocol)
  )
    throw new Error("Use an origin without credentials, path or query.");
  if (
    !local &&
    (target.protocol !== "https:" ||
      env.LOAD_ALLOW_STAGING_ORIGIN !== target.origin ||
      target.hostname === "careathome-platform.vercel.app" ||
      target.hostname ===
        "careathome-platform-haseeb9876s-projects.vercel.app" ||
      target.hostname ===
        "careathome-platform-git-master-haseeb9876s-projects.vercel.app")
  )
    throw new Error(
      "Remote load requires an explicitly allowed staging origin. Production aliases are prohibited.",
    );
  const integer = (name, fallback, max) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`${name} must be an integer from 1 to ${max}.`);
    return value;
  };
  return {
    origin: target.origin,
    concurrency: integer("LOAD_CONCURRENCY", 2, 20),
    requests: integer("LOAD_REQUESTS", 40, 1000),
    timeoutMs: integer("LOAD_TIMEOUT_MS", 10000, 30000),
    p95LimitMs: integer("LOAD_P95_LIMIT_MS", 3000, 30000),
  };
}

export async function runLoad(config, fetcher = fetch) {
  const paths = ["/", "/services", "/providers", "/api/health"];
  const results = [];
  let next = 0;
  const started = performance.now();
  await Promise.all(
    Array.from({ length: config.concurrency }, async () => {
      for (;;) {
        const index = next++;
        if (index >= config.requests) return;
        const path = paths[index % paths.length];
        const start = performance.now();
        let status = 0;
        try {
          const response = await fetcher(config.origin + path, {
            signal: AbortSignal.timeout(config.timeoutMs),
            redirect: "manual",
            headers: { "User-Agent": "CareAtHome-Staging-Capacity-Check" },
          });
          status = response.status;
          // Consume the stream to measure complete responses, without storing content.
          if (response.body) {
            for await (const chunk of response.body) void chunk;
          }
        } catch {
          status = 0;
        }
        results.push({
          path,
          status,
          ms: Math.round(performance.now() - start),
        });
      }
    }),
  );
  const summary = (rows) => {
    const times = rows.map((row) => row.ms).sort((a, b) => a - b);
    return {
      requests: rows.length,
      failures: rows.filter((row) => row.status !== 200).length,
      p95Ms: times[Math.max(0, Math.ceil(times.length * 0.95) - 1)] ?? 0,
      maxMs: times.at(-1) ?? 0,
    };
  };
  const total = summary(results);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Anonymous public GET requests only; not authenticated or clinical capacity acceptance.",
    origin: config.origin,
    concurrency: config.concurrency,
    elapsedMs: Math.round(performance.now() - started),
    ...total,
    passed: total.failures === 0 && total.p95Ms <= config.p95LimitMs,
    p95LimitMs: config.p95LimitMs,
    routes: Object.fromEntries(
      paths.map((path) => [
        path,
        summary(results.filter((r) => r.path === path)),
      ]),
    ),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const report = await runLoad(loadConfiguration(process.env));
    await mkdir("test-results", { recursive: true });
    await writeFile(
      "test-results/capacity-public.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
