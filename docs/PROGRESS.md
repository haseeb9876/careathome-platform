# Progress — 2026-10-15

## Latest direction: Neon migration

The user confirmed Docker was removed and selected Neon, GitHub account `haseeb9876`, and Vercel. Migration and private GitHub source storage are authorised. GitHub CLI access is verified. Neon sign-in is pending in the shared browser; Vercel preview timing is awaiting the user's answer. See [migration decisions](NEON_MIGRATION.md). Earlier runtime-restoration instructions below are historical and superseded: do not reinstall Docker.

The existing application still uses Supabase until its replacements have been implemented and verified. A source checkpoint is being prepared before the migration; no Neon acceptance passes are claimed.

## Current application
The premium redesign is implemented: editorial homepage with a labelled fictional image, locally hosted Manrope/Inter fonts, responsive role-specific workspace, dedicated care screens and a three-step booking flow.

Migrations 001–003 were applied to the existing local Supabase instance on October 14. Real database tests passed: 17 foundation checks and 59 care-workflow checks. Demo accounts and care fixtures were created; 20 notification emails were delivered to the local Mailpit inbox.

Implemented UI and server/database workflows include provider profiles/credentials/verification, discovery filters, availability/time off, assignment/reassignment/rescheduling/cancellation, session completion and amendments, reports/review/private sharing, simulated payments/refunds/receipts, reviews/moderation, support, notifications, services/users/settings/audit. Database-level coverage is not equivalent to browser acceptance.

## Resume-session improvements
- Fixed stale browser selectors, registration password labelling, booking validation redirects and hidden wizard panels.
- Added administrator MFA verification gate; memoized account reads.
- Aligned Next server-action limit with 5 MB credential upload allowance; validate future expiry before upload.
- Added editable availability windows, service-type discovery filter and additional live admin counts.
- Added explicit unavailable summary-adapter failure behaviour, private credential download filename safety and bounded database fetches.
- Added migration 004: indexes, settings constraints, inactive-patient assignment prevention, sharing review metadata, orphan-upload cleanup policy and monotonic email completion.
- Prepared isolated database/private-storage backup and recovery drill script. It is NOT tested yet.
- Formatted source, tests and scripts; updated this checkpoint to replace obsolete infrastructure notes.

## Current blocker — different from the earlier image-download problem
On resuming October 15, ports 54321/54322/54324 were closed. Docker is absent from PATH and its previous Program Files executable is missing. No replacement infrastructure was installed and no database was reset. The user has been asked whether Docker was removed or moved; answer pending.
The existing local Supabase dependency needs restoring before authenticated tests can continue. Existing Docker files/settings alone do not prove that database volumes are intact.

## Verified this resume
- 12 Vitest tests passed (validation + safe summary-adapter configuration).
- 4 public Chrome Playwright tests passed, including 390/768/1440 layouts and authentication redirect.
- Homepage screenshot review and overflow checks passed at those three widths.
- Homepage axe WCAG A/AA check: zero detected violations after contrast fixes.
- Final production build and standalone TypeScript checks passed; editor diagnostics are clear. Lint details are recorded in TEST_RESULTS.md.

## Pending work — do not call the whole application accepted
1. Restore the existing local runtime; verify persisted demo data rather than reseeding/resetting blindly.
2. Apply migration 004 and activate the configured Auth inactivity/timebox settings.
3. Rerun both integration suites. Test MFA enforcement, inactive accounts, credential expiry, reminder dedup/retry and service-price snapshot changes explicitly.
4. Run all updated authenticated Playwright journeys, including PDF fidelity, share expiry/revocation, all roles and mobile navigation. Earlier authenticated browser runs failed; they are not acceptance passes.
5. Inspect patient/provider/admin screenshots and run accessibility checks across those screens.
6. Measure warmed production performance; run persistence restart and isolated backup/recovery drill. Recovery script needs the existing local database container/CLI.
7. Update each requirement with final evidence and provide the full user review walkthrough.

## Boundaries
No application Docker image was built, no deployment occurred, no Git push/remote was created. Only synthetic care data was used. The original PDF and attachment snapshot were not edited. Local configuration and generated credentials remain ignored.


