import { readFileSync, writeFileSync } from "node:fs";
const origin = "http://127.0.0.1:3000";
const password = readFileSync(".env.demo", "utf8").trim().split("=")[1];
const login = await fetch(origin + "/api/auth/sign-in/email", {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({ email: "patient@careathome.test", password }),
});
if (!login.ok) throw new Error("Synthetic measurement sign-in failed");
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
const paths = [
  "/dashboard",
  "/dashboard/bookings",
  "/dashboard/records",
  "/dashboard/reports",
  "/dashboard/profile",
];
async function measure(path) {
  const start = performance.now();
  const r = await fetch(origin + path, {
    headers: { cookie },
    redirect: "manual",
  });
  await r.text();
  if (r.status !== 200) throw new Error("Measurement request failed");
  return Math.round(performance.now() - start);
}
for (const path of paths) await measure(path);
const rows = [];
for (let i = 0; i < 3; i++)
  for (const path of paths) rows.push({ path, ms: await measure(path) });
const times = rows.map((r) => r.ms).sort((a, b) => a - b);
const result = {
  measuredAt: new Date().toISOString(),
  mode: "local optimized production server; one sequential synthetic user; includes Singapore database/network latency",
  requests: rows.length,
  medianMs: times[Math.floor(times.length / 2)],
  p95Ms: times[Math.ceil(times.length * 0.95) - 1],
  rows,
};
writeFileSync(".tools/performance.json", JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({
    requests: result.requests,
    medianMs: result.medianMs,
    p95Ms: result.p95Ms,
  }),
);
