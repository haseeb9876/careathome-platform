# CareAtHome product brief

Source: user implementation brief and the supplied 40-page SRS v1.1 draft (document-control date 9 October 2026; cover dated 10 October). Private original and extracted text are under reference/ and excluded from Git.

Build a premium responsive home nursing and physiotherapy coordination application for patients, providers and administrators. It coordinates care; it does not diagnose or prescribe. Use synthetic data only in local development and the public demonstration.

## Ordered milestones
0. Inspect environment/SRS, preserve brief, map requirements and decisions.
1. Next.js design system, Neon PostgreSQL, migrations, authentication and permission foundations.
2. Provider credentials/verification, managed services, discovery, availability, assignment.
3. Session records, recovery history, rescheduling/reassignment, reviews and operations.
4. Notifications/reminders, payment simulation, local PDF exports, patient-controlled sharing, template-summary adapter.
5. Full acceptance/security/concurrency/responsive/performance/backup-restore verification and handover.

## Delivery rules
All source, scripts, documentation and tests live in this existing project directory. Never nest a second project. Use the authorised private GitHub repository, free Neon development project and Vercel public demonstration. No Docker, paid services or real healthcare data. Earlier local-only restrictions were superseded by the user; see DECISIONS.md.

The full scope includes account recovery/deactivation; administrator MFA; private validated credentials and renewal history; configurable scheduling/travel buffer; auditable state and assignment history; traceable session amendments; decimal-safe payments; eligible reviews/moderation; deduplicated notifications; booking-linked support; report preview/export and expiring/revocable bearer sharing; database-backed administration. These are acceptance obligations, not claims that they are already delivered.

Deferred: native mobile apps, GPS, video, hospital/insurance integrations, autonomous assignment, dynamic pricing, real payments, multi-session packages, doctor accounts, family delegation.
