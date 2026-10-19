# Current progress

## Email OTP implementation — October 19 (not released)

Implemented email verification for new/untrusted sign-ins, password recovery, sensitive account/admin settings, invitations, session revocation and authenticator maintenance. Added a Gmail SMTP adapter, encrypted synthetic inbox, bounded attempts, expiry, single-use/context-bound codes and remembered-device retirement. See [EMAIL_OTP.md](EMAIL_OTP.md). Migrations 011–015 are applied; 013 preserves compatibility with the older public server until the OTP release. New sessions from the OTP server explicitly require verification.

Gmail credentials and real-message delivery remain unconfigured/unverified. Keep the public release on the existing version until the owner privately configures Gmail and real delivery acceptance passes. Exact owner dependency: confirm Google 2-Step Verification and App passwords availability for haseebullahkhan5893@gmail.com, then privately enter the dedicated App Password in Vercel settings. Never request the secret in chat. Current verification evidence is in [TEST_RESULTS.md](TEST_RESULTS.md).

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


