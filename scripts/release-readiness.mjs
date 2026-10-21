import { readFile } from "node:fs/promises";
const config = JSON.parse(
  await readFile(new URL("../release/launch.json", import.meta.url), "utf8"),
);
const missing = [];
if (config.mode !== "production")
  missing.push(
    "Production launch is not approved; demonstration remains enabled.",
  );
if (!config.organization) missing.push("Verified operating organization");
if (!config.countries?.length) missing.push("Launch countries");
if (!config.monthlyBudgetApproved) missing.push("Approved operating budget");
if (
  !Number.isInteger(config.targetConcurrentUsers) ||
  config.targetConcurrentUsers < 1
)
  missing.push("Concurrent-user acceptance target");
if (!config.productionOrigin?.startsWith("https://"))
  missing.push("Permanent production origin");
if (!config.androidPackageId || config.androidPackageId.endsWith(".demo"))
  missing.push("Final Android package identity");
for (const [name, evidence] of Object.entries(config.evidence))
  if (typeof evidence !== "string" || evidence.trim().length < 10)
    missing.push(`Dated evidence: ${name}`);
console.log(
  JSON.stringify(
    {
      readyForProductionReview: missing.length === 0,
      notice:
        "This checks recorded prerequisites, not their truth or Google Play approval. Review the linked evidence manually.",
      blockers: missing,
    },
    null,
    2,
  ),
);
if (missing.length) process.exitCode = 1;
