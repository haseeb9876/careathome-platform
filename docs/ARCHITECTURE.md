# Architecture

CareAtHome is a Next.js modular monolith hosted on Vercel, with Neon PostgreSQL and private Neon S3 storage in Singapore. React server components render the workspace; narrow client components handle navigation, booking steps, uploads, sharing and MFA. Server actions validate input with Zod.

- Accounts: Better Auth, restricted identity database role, signed session cookies, active-account checks, TOTP, backup codes and persistent authentication throttling.
- Business data: restricted application role. Atomic HTTPS transactions set a server-derived identity and local PostgreSQL role before each query. Row-level security and explicit procedure grants enforce authorization.
- Bookings and care: transactional procedures preserve eligibility, price snapshots, status history, immutable clinical records, independent simulated payments, support and reviews.
- Storage: private bucket; server-authorized short-lived signed upload/download URLs. Uploads are capped at 5 MiB and content signatures are checked before registration. Conditional PUT prevents overwriting an uploaded credential. No permanent public URL is exposed.
- PDFs: escaped HTML, JavaScript disabled, network requests blocked. Installed Chrome serves local development; packaged Linux Chromium serves Vercel. Report export requires authorized access and prior review.
- Sharing: patient-created 256-bit bearer token in the URL fragment; only its SHA-256 hash is stored. POST retrieval enforces expiry/revocation and logs access.
- Notifications: transactional outbox and restricted worker. The current development worker captures encrypted synthetic emails; no external transport or public inbox is enabled.

Assignment locks provider/booking rows and rechecks service, area, credentials, availability and time off. A PostgreSQL exclusion constraint prevents overlapping visits including the travel buffer. Completed and Cancelled are terminal. Clinical access requires a relationship; administrators have no automatic clinical access.

Owner/worker secrets are excluded from Vercel runtime environment variables. Git ignores local secrets and private reference documents. Explicit deployment exclusions also keep local environment files, tools, backups and reference documents out of CLI source uploads. Source is held in a private GitHub repository; its master branch deploys to Vercel automatically.

The deterministic report summary is labelled and does not call an external AI service. Payments are simulated. See [test evidence](TEST_RESULTS.md) and [requirements matrix](REQUIREMENTS_MATRIX.md) for acceptance limits.
