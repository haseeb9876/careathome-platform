# CareAtHome

A home-nursing and physiotherapy coordination application built with Next.js, TypeScript, React, Tailwind and Neon PostgreSQL, Better Auth and private Neon object storage.

The redesigned application includes:
- Patient booking wizard, visit status/history, care timeline, reports and patient-controlled sharing.
- Provider application/credentials, availability/time off, assigned visits and traceable session notes.
- Administrator verification, assignment, user/service management, simulated refunds, review moderation, support and audit.
- PDF exports, simulated payments, notifications and a local email worker.

**Current status:** the application runs on Neon without Docker. Live database, authentication, storage and browser checks are recorded in [test results](docs/TEST_RESULTS.md). Remaining release conditions are tracked in [progress](docs/PROGRESS.md). The public synthetic demonstration is available at https://careathome-platform.vercel.app.

Open the local app at http://127.0.0.1:3000 while npm.cmd run dev is running. No Docker is required.

See the [review guide](docs/REVIEW_GUIDE.md) for account access and a walkthrough.

## Review and setup

- [Maintenance and contribution guide](docs/MAINTENANCE.md)
- [Local runbook](docs/LOCAL_RUNBOOK.md)
- [Progress and remaining work](docs/PROGRESS.md)
- [Production and Android roadmap](docs/PRODUCTION_ROADMAP.md)
- [Android test build and device checks](docs/ANDROID_TEST_GUIDE.md)
- [Actual test results](docs/TEST_RESULTS.md)
- [Requirement matrix](docs/REQUIREMENTS_MATRIX.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Desktop preview](docs/screenshots/home-1440.png)
- [Mobile preview](docs/screenshots/home-390.png)

Synthetic demo accounts use patient@careathome.test, provider@careathome.test and admin@careathome.test. Their generated password is in ignored .env.demo. Never use real patient information or payment details.

## Checks
Use npm.cmd run typecheck, npm.cmd run lint, npm.cmd test and npm.cmd run build.
With the ignored Neon development configuration installed, run npm.cmd run test:integration, npm.cmd run test:workflows and the Chrome Playwright suite described in the runbook.

The original private SRS/brief, local secrets, uploaded credentials, backups and generated clinical PDFs are not intended for source control.
