# CareAtHome

A local home-nursing and physiotherapy coordination application built with Next.js, TypeScript, React, Tailwind and Supabase PostgreSQL/Auth/private Storage.

The redesigned application includes:
- Patient booking wizard, visit status/history, care timeline, reports and patient-controlled sharing.
- Provider application/credentials, availability/time off, assigned visits and traceable session notes.
- Administrator verification, assignment, user/service management, simulated refunds, review moderation, support and audit.
- Local PDF exports, simulated payments, notifications and a local email worker.

**Current status:** migration to Neon is authorised and in progress. Docker was intentionally removed. Existing Supabase database test results are historical evidence; Neon compatibility and final browser acceptance remain pending. See the [migration decisions](docs/NEON_MIGRATION.md). Do not restore Docker or run legacy local-only scripts against a cloud database.

Open the local app at http://127.0.0.1:3000 while npm.cmd run dev is running. No deployment or application Docker image has been created.

## Review and setup

- [Local runbook](docs/LOCAL_RUNBOOK.md)
- [Progress and remaining work](docs/PROGRESS.md)
- [Actual test results](docs/TEST_RESULTS.md)
- [Requirement matrix](docs/REQUIREMENTS_MATRIX.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Desktop preview](docs/screenshots/home-1440.png)
- [Mobile preview](docs/screenshots/home-390.png)

Synthetic demo accounts use patient@careathome.test, provider@careathome.test and admin@careathome.test. Their generated password is in ignored .env.demo. Never use real patient information or payment details.

## Checks
Use npm.cmd run typecheck, npm.cmd run lint, npm.cmd test and npm.cmd run build.
With local services restored, run npm.cmd run test:integration, npm.cmd run test:workflows and the Chrome Playwright suite described in the runbook.

The original private SRS/brief, local secrets, uploaded credentials, backups and generated clinical PDFs are not intended for source control.
