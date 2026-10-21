# Current progress

## Pakistan launch and payments — released October 22

PR #3 merged as `65d1503a65c10dfb422efaba623a78c10325acb5`; the public version endpoint and visible Sukoonara Care branding match this release. All 12 hosted public/PWA/patient/provider/admin workspace checks passed. Post-merge web and Android runs `39664998712` and `39664998617` passed. The disabled payment webhook returns 503 as intended. Merchant setup remains the next required owner input; production/Play readiness is not claimed.

Owner chose Pakistan, initially 50 daily users and real payments; budget remains undecided. Working brand: **Sukoonara Care**. Web/PWA, email and Android source branding are updated while existing URLs, package identity and authenticator issuer remain compatible. This is not legal-name clearance.

Safepay hosted-checkout preparation and a separate online ledger are implemented. Migration 017 is applied to the approved synthetic Neon database. Default mode remains simulation; no merchant credentials, live activation or real charge occurred. See [merchant setup and acceptance](PAKISTAN_PAYMENTS.md). Migration hashing now tolerates LF/CRLF encoding differences without rewriting historical hashes or accepting substantive changes.

61 unit tests, 22 database checks, typecheck, zero-warning lint, optimized build and 12 local browser checks pass. Cloud application checks and Android packaging passed on `c7c389c`; the renamed APK is documented in the [Android guide](ANDROID_TEST_GUIDE.md). Provider sandbox acceptance, reconciliation, refund operations, production separation and Play signing/device acceptance remain pending. Next owner input: whether an approved merchant account exists (provider name only). No paid hosting selection is required yet.

## Readiness foundation release — October 21

All 34 local browser scenarios and 55 unit tests pass. Typecheck, zero-warning web lint, production dependency audit and cloud web/Android builds pass. PR #2 is merged and release `5a4b1d7` is live at https://careathome-platform.vercel.app. All 12 targeted hosted scenarios pass, and GitHub service-check run `39556419334` confirms liveness and both restricted database connections. The Android debug APK and unsigned bundle are available for synthetic device testing; see [Android test guide](ANDROID_TEST_GUIDE.md). Sixteen non-blocking Android lint warnings remain, and physical-device/Play acceptance is not complete.

The release adds operational health/readiness endpoints, bounded Neon authentication pools, minimal error classifications, opt-in service monitoring, capacity tooling and explicit Android certificate association. The local public-only baseline is 40 requests/two workers with no failures and p95 532 ms; large-scale authenticated capacity is still unmeasured. Scheduled monitoring is off pending usage/alert ownership, with private credentials already configured.

Next required owner inputs: operating organization, launch country, expected daily/concurrent users, hosting budget and real-payment scope. Then complete the [production roadmap](PRODUCTION_ROADMAP.md), including production separation, backups/restores, privacy/deletion/retention, email delivery, security/device acceptance and permanent Play identity/signing. The app remains a synthetic demonstration. Automatic approval review blocked removal of the temporary local Android generator directory; it remains ignored and excluded from application/build tooling, and no further deletion was attempted.


## Production readiness and Android — October 20 (in validation)

Added uptime/protected database-readiness endpoints, privacy-conscious error classifications, bounded pooled authentication connections, an opt-in monitoring workflow and a production-safe public-load harness. Added the Android TWA source project and GitHub cloud build, plus a certificate-controlled asset-links endpoint. The provisional Android identity is explicitly a demo; the release bundle is unsigned. No local Android SDK or Docker was installed, and no paid plan was selected.

Updated older patient/provider/admin/browser acceptance tests to complete real email OTP. Added a [production roadmap](PRODUCTION_ROADMAP.md), [privacy data inventory](PRIVACY_DATA_INVENTORY.md) and machine-readable release prerequisites. The release preflight currently fails as intended because production business, operational and Play evidence is not supplied. `OPS_HEALTH_TOKEN` was configured privately for Vercel Production/GitHub; the scheduled monitoring switch remains off pending usage/alert-owner review.

55 unit tests, corrected typecheck and clean optimized build pass; expanded browser and Android build acceptance are in progress. Android's first build found a minimum-SDK mismatch; the source now requires API 24 as its browser library does. See [TEST_RESULTS.md](TEST_RESULTS.md) for subsequent results. Next: complete browser/capacity/cloud-build validation, publish the tested web improvements, then obtain the organization/country/capacity/budget/feature decisions required for production.

## Automatic OTP and security hardening — October 19 (released)

Sign-in OTP now sends automatically, survives refresh without sending another email, shows the actual expiry countdown and enables manual resend after expiry. Successful verification opens a fresh dashboard document; notification delivery no longer delays navigation. Added byte-counted public request limits, session-bound password-check throttling, a shared hosted source-IP authentication budget and browser restrictions. No database migration or new dependency is required. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

Typecheck, zero-warning lint, 48 unit tests, optimized build, 17 account-security database checks, 11 OTP database checks and five HTTP authentication checks passed. All six targeted security/browser scenarios passed in 3.0 minutes, including automatic delivery, refresh reuse, expiry/resend and dashboard navigation. All five PWA scenarios passed separately. Release fe08464 passed GitHub checks and is deployed to the public link; all eleven hosted scenarios have passing evidence across the main run and one corrected-fixture rerun. See [TEST_RESULTS.md](TEST_RESULTS.md). Next: scheduled backup/reminder configuration, monitoring and physical-device acceptance, as detailed in the security review. Gmail inbox placement remains recipient-dependent.

## Email OTP implementation — October 19 (released)

Implemented email verification for new/untrusted sign-ins, password recovery, sensitive account/admin settings, invitations, session revocation and authenticator maintenance. Added a Gmail SMTP adapter, encrypted synthetic inbox, bounded attempts, expiry, single-use/context-bound codes and remembered-device retirement. See [EMAIL_OTP.md](EMAIL_OTP.md). Migrations 011–016 are applied; 013 preserves compatibility with the older public server until the OTP release. New sessions from the OTP server explicitly require verification.

The owner configured all three Gmail variables privately in Vercel Production. A staged deployment sent a real verification email, and the owner confirmed successful OTP sign-in on October 19. Credentials and codes were not shared in chat. Release 7dff75f is live at the public application. GitHub checks passed and all four hosted security workflows passed in 2.4 minutes. The temporary review alias was removed and both disposable delivery accounts were retired. Next: monitor delivery and expand real-recipient, device and operational acceptance. Current verification evidence is in [TEST_RESULTS.md](TEST_RESULTS.md).

Public demonstration: https://careathome-platform.vercel.app. Private source: haseeb9876/careathome-platform. Vercel automatically deploys master. No Docker.

## Account administration and session security — October 18

Implemented current-password-protected password changes, verified email changes, MFA-protected administrator invitations and session listing/revocation. Migration 010 is applied. Invitations are single-use, expiring and revocable; public signup cannot choose admin. Email changes preserve the original login until verification. Password and email changes retire all sessions and create audit evidence. Added an encrypted synthetic inbox/shared Resend transport adapter with explicit delivery status; real email delivery remains unconfigured. See [ACCOUNT_SECURITY.md](ACCOUNT_SECURITY.md).

Typecheck, zero-warning lint, 39 unit tests, production build, 17 database security checks, eight HTTP authentication checks and three recovery checks passed. Both new production-browser workflows passed, including mobile settings accessibility. Initial browser selector failures were corrected; rapid authentication checks encountered the existing rate limit, which is preserved and respected by the new test. All three role workspace regressions passed in 57.1 seconds; the mobile settings screenshot was reviewed. Release 5a02333 passed GitHub checks and deployed to the public Vercel alias. All five hosted account-security and role-workspace scenarios passed in 1.4 minutes; the public version endpoint matched the release. Afterwards: configure a verified outbound sender and perform real delivery acceptance, then the remaining operations/device acceptance listed in the security guide.

## Dark by default — October 17

Dark is now the first-visit and invalid/missing-storage fallback, including server-rendered HTML and the offline screen. Explicit saved Light/Dark/System choices are preserved. Typecheck, zero-warning lint, 36 unit tests, the optimized build and three targeted browser scenarios passed: default dark on a light-mode device, saved choices/cross-tab/system changes, blocked storage and offline fallback. The offline cache version is advanced so installed apps receive the new fallback. Next acceptance remains physical-phone appearance/installation review and the service work below.

## Appearance release — October 17

Added Light, Dark and System appearance across public pages and all role workspaces, with pre-paint preference restoration, live device-theme changes, cross-tab synchronization and a blocked-storage fallback. Added larger-text reading comfort, accessible modal controls and the same controls in account settings. Dark surfaces include forms, status badges, installation/update notices and the public offline fallback; print remains light. No new dependencies or database changes. See [APPEARANCE.md](APPEARANCE.md).

Typecheck, zero-warning lint, 36 unit tests and the optimized build passed. All six new appearance browser scenarios passed, including mobile/desktop contrast scans and all three role settings. The existing suite passed 18 of 19 scenarios: the 5 MiB credential test timed out at document validation after transferring the file. The targeted retry completed upload/validation but hit the four-minute test deadline during download. Release 46f241b passed GitHub checks and deployed Ready to the public Vercel alias. All twelve targeted hosted scenarios passed, including all six appearance cases, all five PWA cases and the full credential transfer/content check (25.4 seconds). Visual screenshots were reviewed. The appearance release is complete; the earlier local transfer timeouts remain documented, not erased by the hosted pass. Next: physical iPhone/Android appearance and installation acceptance, then the existing email/backup service work below.

## PWA release — October 17

Added installable CareAtHome manifest, home/care-pulse icons (Android and Apple), an inline first-visit invitation, iOS installation instructions, a dismiss/reopen preference, and installed-mode suppression. Public-only offline fallback caches two resources; care data and submitted forms are not cached. New launches request current HTML, and open apps check for a release and offer refresh without clearing unfinished work automatically. See [PWA.md](PWA.md).

Typecheck, zero-warning lint, 36 unit tests, production build and all 19 Chrome scenarios passed. A normal Chrome profile reported no installability errors and exposed the real install button. Release `7688592` passed GitHub checks and deployed Ready; all six targeted public PWA/accessibility scenarios passed in 30.6 seconds. The public version endpoint matches the release Git SHA. Physical Android/iPhone OS installation and home-screen appearance are the next device acceptance step, distinct from browser simulation. Existing email/backup/nonfunctional acceptance dependencies below remain unchanged.

## SRS usability release

Re-read the supplied 40-page SRS and documented all fourteen acceptance criteria in [SRS_REVIEW.md](SRS_REVIEW.md), with primary W3C/NHS design references and explicit operational dependencies. Improved booking validation/error recovery, review details and state explanations; mobile focus/keyboard/skip navigation; form readability; provider filter validation, results and failure feedback. Retired identified old test providers/services from public discovery through audited procedures while preserving history.

36 unit tests and 59 live Neon workflows passed. Fourteen Chrome scenarios have passing evidence across the optimized suite and the corrected patient-journey rerun. Initial failures and exact limitations are in [TEST_RESULTS.md](TEST_RESULTS.md). Release `15e79b4` passed GitHub checks and deployed to the public Vercel alias; all seven targeted hosted Chrome scenarios passed in 1.3 minutes. The next operational step is a verified outbound email provider/domain, followed by scheduled backup/retention configuration and broader nonfunctional acceptance. Conditional scope remains open; this does not declare complete clinical or stakeholder acceptance.

## Cleanup release

Removed retired Supabase configuration, migrations, scripts and integration suites from the active tree; their history remains in Git. Applied Neon migrations 000-009 are unchanged. Removed the unused application pool, superseded upload action, duplicate visual capture tool, obsolete matrix generator and unused Nodemailer packages.

Split dashboard rendering into fourteen named screen modules with an explicit role registry. Extracted action validation/procedure definitions from server action execution. Split the global stylesheet into six ordered stylesheets; parsed CSS rules and declaration order were checked to be identical. Private local environment, backup and SRS files are preserved.

The maintenance guide describes ownership, setup, migrations, verification and deployment. Static checks, zero-warning lint, 33 unit tests, optimized build and 59 Neon workflows pass. Twelve of thirteen Chrome scenarios passed across local runs; administrator access passed on retry. Cleanup commit 0ffc743 is deployed and GitHub CI passed. On resume, all six private-storage scenarios passed, including the 5 MiB signed transfer, overwrite protection and unauthorized access checks. The targeted public Chrome credential journey also passed in 40.4 seconds, including byte-exact download and disguised-content rejection. The earlier failure was intermittent; its root cause is not established, and the 90-second timeout/retry guidance remains. All five hosted role/report/accessibility scenarios passed. See TEST_RESULTS.md for detailed evidence. The requested cleanup is complete and its previously blocked upload scenario now has a successful hosted rerun. Continue monitoring storage reliability; the next product steps are the service/acceptance items below.

## Existing verified functionality

The previous release passed 13 hosted Chrome scenarios plus receipt PDF export, 59 Neon care-workflow checks, 18 foundation checks, 8 HTTP auth scenarios, 3 recovery checks, 6 private storage scenarios and 33 unit tests. Those results predate the current refactor and are regression baselines.

## Remaining product/service work

External email transport, scheduled backups, broader performance/browser/accessibility acceptance and the conditional/deferred SRS features remain open. Payments are simulated and summaries deterministic. The phrase "other app" still needs a project name/path before work can begin in another repository.


