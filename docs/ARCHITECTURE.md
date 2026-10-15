# Architecture

A local Next.js modular monolith: App Router server components, narrow client components for navigation/booking steps/sharing/MFA, Zod-validated server actions, Supabase cookie Auth and PostgreSQL RPC/RLS boundaries.

- accounts: authentication, recovery, active-account checks, MFA.
- bookings: request input and original pricing.
- care: provider operations, scheduling, clinical records, payments, reviews/support, settings and administrative screens.
- reports: explicit local-only summary-adapter configuration. SQL creates immutable source snapshots and labels the deterministic summary.
- shared infrastructure: cookie-bound Supabase client, formatting and local Chromium PDF rendering.
- background worker: local notification outbox and reminders, using a server-only service credential and loopback Mailpit API.

Application mutations use the user's database identity. The service-role key is reserved for local provisioning, fixture scripts, recovery and the email worker. Runtime page/actions never use it to bypass clinical RLS.

PDF rendering disables JavaScript and aborts browser network requests; all source text is HTML-escaped. Report download first checks user access and review state. Sharing uses a random 256-bit token in a URL fragment, stores only its SHA-256 hash and transmits the token in a POST body. Expiry/revocation are checked in PostgreSQL with access logging. These paths still need final browser acceptance.

Booking assignment locks provider/booking rows, rechecks service/area/credentials/availability/time off, and is protected by a PostgreSQL GiST exclusion constraint including travel buffer. Completed and Cancelled are terminal. Payments use integer minor units and stay separate from booking state.

The developer environment uses loopback HTTP. Deployment/TLS/cloud operations remain outside current authorisation. Installed Next.js documentation, Supabase MFA reference, Playwright PDF documentation and Mailpit API documentation informed implementation; dependencies are pinned in the lockfile.

