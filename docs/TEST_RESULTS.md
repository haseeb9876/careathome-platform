# Test evidence

## Production readiness acceptance â€” October 21

- All 34 local Chrome scenarios passed across the six-scenario targeted run (1.8 minutes) and the remaining 28-scenario run (11.2 minutes). This includes real synthetic OTP, role workspaces, admin invitations, account changes, full 5 MiB credential transfer/content rejection, reports/sharing, appearance/accessibility, PWA/offline/update behavior and request protections.
- Typecheck, zero-warning web lint and all 55 unit tests passed. Production dependency audit: zero known vulnerabilities. Optimized web build passed GitHub runs `39555185965` and `39555375841`; no database migrations were changed.
- Android compilation, lint and packaging passed `39554727171` and PR run `39555375990`. The native backup warning is fixed. Sixteen non-blocking Android lint warnings remain in generated unused resources, icon shape/monochrome support and build-tool version suggestions; no claim of zero-warning Android lint or physical-device acceptance is made.
- Local bounded public-load results remain 40 requests/two workers, zero failures, p95 532 ms. No authenticated capacity or daily-user estimate is inferred.
- PR #2 merged as `5a4b1d7bcaff81edd3fe0ca6fdb3bf123b2ef00a`. The public version endpoint matched this SHA and Vercel reported Ready. All 12 hosted OTP/operations/PWA/security scenarios passed in 1.7 minutes. Manual GitHub service-check run `39556419334` passed and explicitly reported databaseReadiness checked. Master web/Android checks `39556223863` and `39556223830` passed. The monitoring schedule remains disabled.


## Production readiness and Android Ã¢â‚¬â€ October 20

- 55 unit tests pass. Initial readiness-query typing was corrected by using the pool's bounded query configuration. Typecheck and optimized build pass; an initial Edge-instrumentation warning was fixed by separating environment-neutral telemetry from Node-only token verification.
- Five HTTP authentication checks passed against the running optimized server. An earlier invocation before server startup failed with connection refused; it was a test-order issue.
- Production release preflight correctly exits nonzero with explicit missing organization, scope, operating and Play evidence. It is not a production-readiness pass.
- Initial Android cloud run `39381424153` failed because the generator selected minimum API 21 while browser-helper 2.7.4 requires API 24. Updated minimum SDK and removed the obsolete manifest package attribute; rerun pending.
- Android cloud run `39381824047` passed compilation, lint, debug APK and unsigned AAB generation. Android lint reported 17 warnings, including backup configuration; explicit native backup/device-transfer exclusions were subsequently added. Run `39554727171` passed with those exclusions. Physical Android acceptance and Play signing remain pending.
- October 21: all 55 unit tests pass; production dependency audit reports zero known vulnerabilities. Six targeted browser checks pass: patient registration/booking/profile/cancellation, provider registration, admin request review, liveness/unauthorized readiness, empty-by-default Android association and authenticated readiness for both restricted database connections.
- Earlier browser runs exposed outdated registration expectations and test-helper races: a transient dashboard URL and Next's route announcer were mistaken for successful sign-in/delivery failure. Tests now complete real OTP and scope delivery errors to main content. The earlier broad run was interrupted after the credential-transfer timeout; remaining journeys are being rerun, not counted as passed.
- Bounded local optimized-server capacity baseline: 40 anonymous GETs, two workers, zero failures, 4.472 seconds total, p95 532 ms, maximum 1418 ms. Four routes: home, services, providers and liveness. This is not an authenticated-load result or a daily-user capacity guarantee.
- Remaining browser and final hosted checks are in progress.

## Automatic OTP and request security Ã¢â‚¬â€ October 19

- Typecheck, zero-warning lint, 48 unit tests and optimized build passed. A new test initially had an inferred HeadersInit type mismatch; using explicit Headers objects corrected it before the final successful typecheck/build.
- All 17 account-security and 11 OTP Neon database checks passed. All five HTTP authentication checks passed against the optimized local server.
- All five PWA Chrome scenarios passed in 13.1 seconds with the new response headers, including offline behavior and update notification preserving an unfinished form.
- Production dependency audit: zero known advisories. Development-only advisories and scope limitations remain documented in [SECURITY_REVIEW.md](SECURITY_REVIEW.md).
- All six targeted security/browser scenarios passed in 3.0 minutes on the optimized local server: invitations, password/email changes, authenticator maintenance, automatic OTP/remembered-device/recovery, request rejection and response headers. The OTP scenario verifies refresh reuse, expiry/resend and a fresh dashboard navigation without clicking the logo. Hosted release validation follows publication.
- Release `fe08464b6956cc25c9f20bb3b2ed416775d90123` passed GitHub checks (run `39290152156`) and deployed Ready (`dpl_GqojRNswB61yVjkgzT9fnnwQJsmw`). The public version endpoint matched that SHA.
- Hosted run: 10 of 11 passed in 3.5 minutes. The account-change test reached automatic sending before its disposable-fixture cooldown acceleration, so the server correctly rejected a rapid repeat request. The helper now prepares only its strictly named synthetic fixture before navigating. Production cooldowns are unchanged. The targeted rerun passed (44.9 seconds for the scenario; 1.1 minutes total). Thus all eleven have passing hosted evidence across runs, not a single uninterrupted pass. Typecheck and zero-warning lint passed after the test-only correction.

## Email OTP Ã¢â‚¬â€ October 19, local acceptance

Release `7dff75f` deployed to https://careathome-platform.vercel.app and the public version endpoint matched the Git merge commit. GitHub checks passed. All four targeted hosted Chrome scenarios passed in 2.4 minutes: administrator invitation/MFA/recipient activation; password and verified-email changes/session retirement; authenticator enrollment/recovery-code replacement/audit; and email verification/wrong-code handling/remembered-device/password recovery. Synthetic tests included mobile automated accessibility checks. This is targeted security acceptance, not a rerun of the entire SRS suite. The owner separately confirmed real Gmail OTP sign-in. Temporary delivery accounts were deactivated and the temporary review alias removed.

- Typecheck, optimized build and 43 unit tests passed, including Gmail transport configuration, encrypted synthetic delivery and denial when the shared send budget is exhausted.
- All 11 OTP database checks and 17 account-security database checks passed with migrations 011Ã¢â‚¬â€œ015 applied. Migration 016 adds atomic recovery-code audit recording; the targeted browser test verifies its audit entry.
- All five updated HTTP authentication checks passed: no automatic registration session, unforgeable verification flags, closed bypass endpoints, private-report denial for pending sessions and sign-out invalidation.
- All four targeted browser workflows have passing evidence across the final run and targeted rerun: administrator invitation, password/email changes, remembered-device/password recovery, and authenticator enrollment/recovery-code replacement. The last authenticator test passed in 55.6 seconds, including the audit entry. Earlier runs exposed session rotation and a restricted-role audit write; both were fixed. An interrupted-server run timed out before reaching authenticator enrollment. Initial redirect-timing errors in the test helper were also corrected. Browser traces are disabled to protect verification material.
- GitHub static/unit/build checks pass for 4a52010, including a build without private environment files. The initial CI build exposed credential access before request-time rendering; the OTP page now awaits request headers first.
- The owner privately configured Gmail in Vercel Production. A staged deployment sent a real email to an owner-controlled Gmail alias. After the first code/session expired, a fresh disposable test session sent another code; the owner confirmed successful OTP sign-in on October 19. No secret or code was shared in chat. Public promotion and hosted regression acceptance follow this result. Historical hosted results below describe earlier versions.

## Default dark Ã¢â‚¬â€ October 17

- Typecheck, zero-warning lint, 36 unit tests and optimized production build passed.
- Three targeted Chrome scenarios passed locally in 54.9 seconds: first visit uses dark even with a light device setting; saved preferences and System behavior remain usable; denied storage still defaults dark; the real service-worker offline fallback also defaults dark. Existing tests were updated to exercise a light device without a saved theme.

## Appearance Ã¢â‚¬â€ October 17

- Typecheck, zero-warning lint, 36 unit tests and production build passed.
- Six new Chrome scenarios passed in 4.3 minutes: persistence/system changes/tab synchronization/form preservation; blocked local storage; public pages and modal at 390/1440 widths with automated WCAG A/AA scans; patient/provider/admin dark workspaces and larger-text settings. Mobile modal, homepage and patient settings screenshots were visually reviewed.
- Existing optimized-server suite: 18 of 19 passed in 10.1 minutes. All three role navigation cases now run in dark mode; existing light-mode responsive/accessibility checks remain. Booking, registration, admin queue, report PDF/sharing/revocation and all five PWA cases passed. Offline navigation additionally verifies the selected dark theme.
- The 5 MiB credential scenario timed out after 120 seconds waiting for completion, displaying `Checking your documentÃ¢â‚¬Â¦` after its transfer phase. This repeats the previously recorded intermittent path; it is not attributed to the appearance change without evidence. The targeted retry completed upload/validation but hit the four-minute test deadline during the private download (download canceled when the test ended). The hosted rerun passed in 25.4 seconds, including byte-exact download and disguised-content rejection. No upload code was changed; local transfer reliability remains an observation to monitor.
- Release `46f241bd35c4c42a317232b11a5b900987edc689` passed GitHub Application checks (run `39026604353`) and deployed Ready (`dpl_9XZ8KVEcfbzCmnwq9hhJqFPUVkW7`). The public version endpoint returned that exact SHA. All twelve targeted hosted scenarios passed: six appearance, five PWA and the credential transfer case. This supplies passing evidence for all 25 browser scenarios across local/hosted runs, not a single uninterrupted full-suite pass.
- Physical-device and broader manual accessibility acceptance remain separate from Chrome emulation and automated scans.

## PWA Ã¢â‚¬â€ October 17

- Standalone TypeScript, zero-warning ESLint, 36 unit tests and optimized production build passed.
- All 19 Chrome scenarios passed in one optimized-server run (3.0 minutes), including the existing patient/provider/admin, upload, PDF, sharing, responsive and accessibility journeys.
- Five new PWA cases passed: manifest/icons/worker headers/version endpoint; iPhone instructions and dismissal/reopening; a simulated native installation event gated by a user click and installed-mode suppression; real-worker offline navigation/reconnection with only the two allowed public resources cached; and release detection that preserves an unfinished form.
- A separate normal (non-incognito) Chrome profile returned an empty `Page.getInstallabilityErrors` list and displayed a real Install app button. Its temporary profile was removed after inspection. The initial incognito diagnostic returned only `in-incognito`, as expected; incognito behavior is not evidence of an app packaging defect.
- Initial floating install-card regression blocked a registration control. Replaced it with an inline panel, then reran the complete suite successfully. This was a UI correction, not a test bypass.
- Physical iPhone/Android OS installation, home-screen icon rendering and lifecycle behavior remain manual device acceptance. The tests simulate iOS identification and a native install response; they do not claim real-device installation.
- Release `7688592` passed GitHub Application checks and deployed Ready (`dpl_5xvavxCNACT4ZBPZbnMxjQXZFGQ6`) to https://careathome-platform.vercel.app. The uncached public version endpoint returned the exact release Git SHA.
- All six targeted hosted Chrome scenarios passed in 30.6 seconds: the five PWA cases plus responsive primary-screen accessibility. This includes a real service worker and offline fallback on the HTTPS production origin. Native iPhone/Android installation remains the physical-device check described above.

## SRS usability review Ã¢â‚¬â€ October 16

- 36 unit tests passed, including rollover dates, timezone conversion and the 180-day booking boundary.
- All 59 live Neon care workflows passed again. No applied migrations changed.
- Zero-warning ESLint and the final optimized production build passed. The build's TypeScript check passed after fixing the booking-status lookup type.
- Initial development-server browser run: the new patient assertion matched both the intended error and Next.js's route announcer; the selector was corrected. Provider sign-in exceeded the test deadline during a slow development run. The run was stopped and switched to the optimized server; neither failure is counted as a pass.
- Optimized-server Chrome suite: 13 of 14 scenarios passed in the main run (5.5 minutes). The address assertion failed after a controlled-textarea update; the address now has a separate explicit label. Its complete patient journey passed on targeted rerun in 31.6 seconds, including past-date rejection, address retention after a rejected server request, successful retry, profile update, cancellation and logout. All 14 scenarios therefore have passing evidence across these runs, not one uninterrupted green run.
- Passing coverage includes 5 MiB private upload/download and disguised-content rejection, provider registration, administrator queue, all three role workspaces, mobile focus trapping/Escape/restore, report PDF/sharing/revocation, invalid provider filters and responsive public layouts. Axe scans found no violations in their configured primary-screen scope; this is not a full manual accessibility certification.
- Five identified historical test-provider accounts and two duplicate test services were deactivated through audited application procedures. Their records remain available. The directory was rechecked and shows the curated demonstration professional and two intended services.
- Release commit `15e79b4` passed GitHub Application checks and deployed Ready on Vercel (`dpl_E65F5RUbXCztpxktih5mjJCTJc8i`). The public alias is https://careathome-platform.vercel.app.
- All seven targeted public Chrome scenarios passed in 1.3 minutes: complete patient registration/validation/rejected-request recovery/profile/cancellation/logout, provider registration, invalid-filter recovery, patient/provider/admin workspaces with mobile keyboard navigation, and responsive primary-screen axe scans. The final provider copy handles singular/plural results correctly. Standalone typecheck, zero-warning lint and the final production build also passed.

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
# Account security Ã¢â‚¬â€ October 18

- Typecheck, zero-warning lint, optimized production build: passed.
- Unit tests: 39 passed, including encrypted synthetic mail isolation, refusal of unconfigured real delivery and provider failure handling.
- Neon migration 010: applied successfully. Account security suite: 17 passed (role isolation, MFA, token delivery/expiry/revocation/replay/concurrency, email verification, session ownership and audits).
- Password recovery: all three checks passed. HTTP authentication: all eight checks passed on the separate rerun. The first concurrent run failed at the post-enrollment login assertion; subsequent rapid browser sign-ins returned HTTP 429. Better Auth's existing three-request/ten-second route limit was confirmed in installed source and remains unchanged.
- New Chrome production-browser workflows: two passed in 1.2 minutes. Administrator invitation MFA denial, invitation acceptance, administrator access and link replay rejection; incorrect/correct current password, other-device session invalidation, verified email change and subsequent sign-in; 390px settings overflow and axe checks.
- Initial browser runs failed on ambiguous label/alert selectors, including the hidden Next.js route announcer. Tests now use exact labels/scoped alerts. Valid login retries respect HTTP 429 instead of weakening throttling.
- Real email delivery, physical phone acceptance and complete nonfunctional/SRS acceptance remain pending. All three role workspace regressions passed in 57.1 seconds, including mobile layout, larger text and accessibility scans; the administrator mobile screenshot was reviewed. Release 5a02333 passed GitHub checks and deployed to the public Vercel alias. All five targeted hosted Chrome scenarios passed in 1.4 minutes, including both account-security workflows and the three role workspaces. Public version matched 5a02333f61764af7ea84c5e6450085e71b9fe537.


