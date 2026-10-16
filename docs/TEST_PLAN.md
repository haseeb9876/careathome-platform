# Verification plan

## Routine checks

Run TypeScript, ESLint, Vitest and optimized production build for code changes. Use existing tests for behavior-preserving refactors rather than tests that merely mirror new file structure.

## Live synthetic regression

- Foundation: registration roles, ownership/RLS, server-controlled booking prices, idempotency and terminal states.
- Care: credentials and verification, eligibility, availability/travel buffer, simultaneous assignment, rescheduling and suspension, clinical ownership/amendments, simulated payments, reviews, reports/private shares and support.
- Authentication: logout, password recovery, MFA, backup codes and persistent throttling.
- Storage: byte equality, private access, signed 5 MiB transfer, overwrite protection, content validation and orphan cleanup.
- Browser: all roles and major workflows, responsive widths 390/768/1440, accessible primary screens, PDF/share flows, uploads and mobile navigation.

Run against the explicitly configured synthetic Neon target. Never reset or clean up unknown patient data. See package scripts and the local runbook for commands.

## Additional acceptance

Document hardware, seeded row counts, concurrent clients, warm/cold state and p50/p95 for load tests. Preserve database and object backups separately, restore to isolated targets and verify content hashes. Repeat operational recovery regularly after a retention policy exists. Complete Firefox/WebKit, keyboard and screen-reader checks; automated Chrome/axe checks do not cover these.
