const origin = "https://careathome-platform.vercel.app";
async function check(path, authorized = false) {
  const response = await fetch(origin + path, {
    redirect: "error",
    headers: authorized
      ? { Authorization: `Bearer ${process.env.OPS_HEALTH_TOKEN}` }
      : {},
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error("A service check returned an unsuccessful status.");
  const data = await response.json();
  if (data.status !== "ok")
    throw new Error("A service check reported unavailable.");
}
try {
  await check("/api/health");
  if (process.env.OPS_HEALTH_TOKEN) await check("/api/health/ready", true);
  console.log(
    JSON.stringify({
      status: "ok",
      liveness: true,
      databaseReadiness: process.env.OPS_HEALTH_TOKEN
        ? "checked"
        : "not-configured",
    }),
  );
} catch {
  console.error(
    "CareAtHome service check failed. Inspect the deployment and protected readiness checks; no response data or credentials were logged.",
  );
  process.exitCode = 1;
}
