# Web and Android production readiness — October 20

This is the implementation ledger for the owner's request to prepare large-scale web and Google Play releases. Existing synthetic-demo deployment authorization continues. No paid service, real payment provider, clinical retention rule or production organization is invented.

October 22 update: Pakistan launch, 50 initial daily users and real payments are authorized. The working brand is Sukoonara Care. Safepay integration preparation is implemented but remains disabled pending merchant credentials and provider acceptance; see [payment setup](PAKISTAN_PAYMENTS.md). Budget, legal operator and accepted concurrent-user capacity remain unresolved.

## Current implementation

- Public liveness `/api/health`, protected database readiness `/api/health/ready`, and deliberately minimal server-error telemetry. Readiness uses a separate minimum-32-character bearer token and never returns connection details. A liveness success alone is not dependency readiness.
- Authentication pools default to two connections per server, rotate connections after five minutes and bound query waits. Hosted connections must use the Neon pooler; application data already uses the HTTP transaction driver. Pool size is configurable from one to five, not an unlimited scaling setting.
- A bounded public-load harness refuses known production aliases, follows no redirects and records status/p95/max without storing page content. It checks only anonymous GET traffic; authenticated booking/clinical capacity remains unverified.
- An Android source project targets API 36, with the existing app artwork, no cleartext traffic and no native backup. GitHub builds a debug APK and unsigned AAB. No SDK is installed on the owner's laptop. See [Android build guide](../mobile/android/README.md).
- A Digital Asset Links endpoint grants no app trust until the real package and app-signing certificate are explicitly configured.
- A service-check workflow can run manually. Its hourly schedule is opt-in via `OPERATIONS_MONITORING_ENABLED=true`; database probing additionally requires `OPS_HEALTH_TOKEN`. Failure appears in GitHub Actions; configure owner notification preferences and escalation separately. GitHub scheduling is best-effort, not a production uptime SLA.
- `npm run release:check` lists unresolved production prerequisites from [launch configuration](../release/launch.json). Passing this metadata check is not proof of the evidence or Play approval.

## Remaining acceptance and owner inputs

| Area | Required completion |
|---|---|
| Launch scope | Legal organization, accepted concurrent-user target, budget and remaining launch feature decisions; Pakistan and 50 initial daily users are confirmed |
| SRS | Client acceptance of all agreed workflows; real payments now require merchant acceptance; distinguish deferred AI/packages/doctor roles from bugs |
| Payments | Approved merchant account, private sandbox credentials, provider checkout/refund acceptance, reconciliation and dispute/support operations |
| Infrastructure | Separate production/staging targets, plan selection, cost alerts, rollback and capacity measurements |
| Email | Verified transactional sender/domain, delivery and bounce handling, tested failure/retry behavior |
| Reminder worker | Deployment schedule and end-to-end delivery acceptance; current worker captures to encrypted development inbox |
| Backups | Automated database AND object backups to an agreed destination, retention, monitoring and repeated restore drills |
| Security | Independent assessment, strict script policy compatibility, tracked development advisories, abuse/load tests |
| Privacy | Approved organization/contact details, actual data inventory, justified retention periods, deletion fulfillment and health-related service policies |
| Device acceptance | Physical Android/iPhone web/PWA checks, screen readers, slow/interrupted networks and patient usability |
| Android release | Final identity, Play signing certificate, verified association, signed bundle and physical-device tests |
| Play submission | Organization verification, privacy/Data safety/Health declarations, listing, reviewer access, test tracks and review |
| Operations | Named incident/support owner, monitored alerts, provider credential authority, production-data onboarding |

## Running checks

Use an optimized local server for the first capacity run:

```powershell
$env:LOAD_BASE_URL='http://127.0.0.1:3000'
$env:LOAD_CONCURRENCY='2'
$env:LOAD_REQUESTS='40'
npm.cmd run test:capacity
```

Increase load only on a separately authorized staging origin, with a measured target and allowance. Remote runs additionally require `LOAD_ALLOW_STAGING_ORIGIN` to exactly match. The hard limits are 20 workers and 1000 requests; they prevent accidental stress and are not claimed product capacity. The default p95 threshold is a provisional 3000 ms test threshold, not an accepted SRS performance guarantee.

`test-results/capacity-public.json` contains the latest measurements. Include environment and test scope whenever reporting results. It cannot determine daily users or authenticated throughput.

## Deployment and monitoring

Configure `OPS_HEALTH_TOKEN` privately in Vercel and the GitHub repository secrets using the same randomly generated value. Never put the token in a URL, source, browser storage or build output. Redeploy, run the manual Service monitoring workflow, then enable the schedule only after reviewing usage and notification routing. Readiness probes wake the database and consume allowance.

Deployments remain clearly marked as synthetic until the launch prerequisites are accepted. Application test evidence, Android build evidence, physical-device evidence and Play approval are separate milestones. See [TEST_RESULTS.md](TEST_RESULTS.md).
