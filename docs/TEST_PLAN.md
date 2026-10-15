# Test plan

Foundation automated checks:
- Vitest: registration validation including forbidden admin role, provider profession, length constraints; booking input and terminal transition rules.
- Integration: real local Auth/RLS/RPCs; tampered metadata, cross-patient reads/writes, server price ownership, duplicate request idempotency, invalid dates, terminal cancellation, direct role mutation rejection.
- Playwright: public navigation, mobile/tablet/desktop overflow, patient registration/login/profile/request/cancel/logout, pending provider access, admin queue.
- TypeScript strict checks, ESLint, production build.

Later mandatory acceptance: credential object access/content validation; verified eligibility; availability/travel buffer; concurrent assignments to the same slot; suspension/reassignment; rescheduling; patient/provider record ownership; amendments; duplicate payment callbacks; review eligibility/moderation; PDF source fidelity; report expiry/revocation; reminder retries/dedup; adapter failure; account deactivation and admin MFA.

Performance: document machine, seeded row counts, concurrent clients, warmed/cold state and measured p50/p95; target SRS NFR-007 p95 <3s. No performance claims until measured.

Persistence: create data, restart application and database without reset, assert records remain. Backup database and private Storage separately, restore to isolated local targets, verify counts/object hashes. Never restore over current work.

Browsers: Chromium automated initially; Firefox/WebKit compatibility pending. Visual review at 390×844, 768×1024, 1440×1000. Inspect focus, overflow, label readability, navigation and all meaningful states.
