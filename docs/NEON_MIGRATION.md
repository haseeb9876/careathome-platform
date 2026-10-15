# Neon migration

## Approved scope — October 15, 2026

The user selected Neon, GitHub account `haseeb9876`, and Vercel as the intended hosting platform. This supersedes the original brief's Supabase-only and no-GitHub restrictions. Docker was deliberately uninstalled and must not be reintroduced. Use free development resources with synthetic data. Deployment timing is awaiting clarification: the previous requirement was local review before deployment.

## Compatibility decisions

- Preserve all seven booking states, PostgreSQL exclusion constraints, transaction locks, price snapshots, immutable records, RLS and explicit function grants.
- Use Neon PostgreSQL; separate migration-owner credentials from a restricted application connection. Requests must establish authenticated identity inside a transaction and clear it at transaction end. Never run user queries through an unrestricted owner connection.
- Authentication must retain registration, recovery, session revocation, rate limiting and administrator MFA. Neon's managed Better Auth roadmap still lists MFA as upcoming. Evaluate Better Auth hosted inside the existing Next.js application with its supported two-factor plugin and Neon persistence; do not silently remove MFA to adopt managed auth.
- Use private object storage with authenticated, authorised downloads. Neon now offers S3-compatible object storage, including Singapore; confirm availability in the selected account before provisioning. Never make provider credentials public.
- Replace Docker/Mailpit-dependent scripts with development-safe equivalents. Keep existing Supabase migrations and passing test evidence as historical reference until Neon equivalents pass.
- Vercel PDF generation cannot assume Chrome is installed on the host. Select and test a compatible PDF implementation before preview deployment.

## Acceptance gates

1. Create a private source checkpoint after checking ignored files and scanning source for credentials.
2. Authenticate Neon, inspect existing projects, and use an isolated CareAtHome development project/branch on the Free plan.
3. Port schema, identity, private storage and application data access; run role-isolation and concurrency regression tests against Neon.
4. Port provisioning, notifications, backup/restore and browser fixtures. Test recovery and administrator MFA explicitly.
5. Complete patient/provider/admin browser journeys, PDF exports, mobile/tablet/desktop review, accessibility and performance checks.
6. Reconcile every requirement against actual evidence. Deploy only within the clarified scope and present a review walkthrough.

No Neon database has been connected or migration accepted merely by writing this document. Earlier Supabase test passes do not establish Neon compatibility.

## Official references checked October 15

- [Neon Supabase migration](https://neon.com/docs/auth/migrate/from-supabase)
- [Managed authentication roadmap](https://neon.com/docs/auth/roadmap)
- [Neon private object storage](https://neon.com/docs/storage/overview)
- [Better Auth PostgreSQL adapter](https://better-auth.com/docs/adapters/postgresql)
- [Better Auth two-factor authentication](https://better-auth.com/docs/plugins/2fa)
