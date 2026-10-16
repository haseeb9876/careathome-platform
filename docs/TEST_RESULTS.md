# Test evidence

## Resume verification

- `npm.cmd run test:storage`: all six scenarios passed, including 5 MiB byte-exact signed upload/download, overwrite denial, private authorization, size bounds and orphan cleanup.
- Public Chrome `credentials.spec.ts`: passed (40.4 seconds; runner 46.6 seconds). Full-size credential upload, byte-exact private download and disguised-content rejection succeeded against https://careathome-platform.vercel.app.
- This is a successful rerun of the previously blocked cleanup scenario, not evidence that an underlying service/network fault was fixed. Earlier timeouts/HTTP 500 responses remain recorded below. No storage implementation or timeout setting changed in this resume.
- GitHub CI passed for cleanup and follow-up commits through 04db270. Applied migrations remain unchanged against the pre-cleanup checkpoint; working tree was clean before this evidence update.

## Cleanup regression

- TypeScript, zero-warning ESLint, 33 unit tests and optimized build passed.
- All 59 live Neon care workflows passed. Applied SQL migrations are byte-for-byte unchanged.
- Production dependency audit: zero known vulnerabilities; development-tool advisories are outside that count.
- Stylesheet extraction preserved parsed CSS rules and declaration order. Homepage visual inspection and responsive/axe checks passed.
- First Chrome run: 11 passed, 2 failed (5 MiB upload remained pending; admin sign-in returned its generic failure message). Separate storage attempts encountered a database connection timeout and then Neon storage HTTP 500 on the large PUT. The admin workspace passed on targeted retry, giving 12/13 successful local scenarios across runs. The large upload retry reached the new explicit timeout message; it is not counted as a successful transfer.
- Added a 90-second browser upload timeout with clear retry guidance. The upload test allows 120 seconds for transfer plus registration; it still requires a successful byte-exact download and rejects disguised content.
- Source-reference scan found no non-route source files without an inbound source import. Exact runtime-secret scan passed. This is a focused cleanup audit, not a proof that every export is necessary.
- Cleanup commit 0ffc743 deployed successfully; GitHub CI passed. All five post-deployment Chrome scenarios passed: patient/provider/admin workspaces and mobile navigation, report/PDF/private-share revocation, and responsive primary-screen accessibility. The public homepage returned HTTP 200.

## Previous public release - October 16, 2026

- 33 unit tests; standalone TypeScript, lint, production build and GitHub CI passed.
- 18 live Neon foundation checks; 59 care workflows using atomic HTTP identity transactions.
- 8 HTTP authentication scenarios, including TOTP/backup codes/logout/rate limiting; 3 encrypted-inbox password recovery scenarios.
- 6 private-storage scenarios including 5 MiB signed upload/download, overwrite denial, unauthorized access and size limits.
- 13 hosted Chrome scenarios passed across corrected runs: patient registration/booking/profile/cancellation/logout, provider registration, admin queue, responsive public pages, protected redirect, all role workspaces/mobile navigation, reports/PDF/sharing/revocation, primary-screen accessibility and 5 MiB credential transfer/content rejection. Hosted receipt PDF also passed.
- An initial hosted PDF failure (missing Playwright runtime file) was corrected and retested successfully.
- Isolated recovery restored a database checkpoint and a separately encrypted object with matching SHA-256. No automatic backup schedule is implied.
- 20 synthetic notification emails were processed into the encrypted development sink. No external messages were sent.

## Performance scope

HTTP adapter, local optimized server: 15 warm sequential requests, median 751 ms, p95 829 ms. Public Vercel from the development laptop: 15 warm sequential requests, median 220 ms, p95 472 ms. These are small single-user measurements, not a concurrent load test. Earlier TCP measurements were median 3353 ms and p95 5358 ms.

## Limits

Chrome coverage is not Firefox/WebKit acceptance. Automated axe checks are not full keyboard/screen-reader accessibility acceptance. Outbound email, backup scheduling and real clinical operations are not complete. Database evidence is distinct from UI acceptance; see the [requirements matrix](REQUIREMENTS_MATRIX.md).
