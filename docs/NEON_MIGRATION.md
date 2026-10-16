# Neon migration

The user selected Neon, GitHub and Vercel. The migration is implemented and its main workflows tested; public deployment was authorised October 16, 2026.

- PostgreSQL: project `fancy-brook-14378314`, development branch `br-nameless-glitter-b395hmhx`, Singapore, database `careathome`.
- Application, authentication and notification worker use separate restricted database roles. Only migrations and explicit synthetic fixture tooling use the owner role.
- Better Auth owns identity/session tables. Business authorization remains PostgreSQL RLS and restricted procedures. Transaction-local identity prevents cross-request leakage.
- Private Neon S3 credentials bucket replaces Supabase storage. Signed transfer URLs expire quickly and require server-side ownership authorization. Content validation precedes credential registration.
- Applied authoritative migrations: 000?009. Do not edit applied migration files or reset data. Original Supabase SQL is preserved in Git history, not the active tree.
- `.env.neon`, `.env.local`, generated credentials, private SRS and backup files are ignored. Vercel receives only runtime app/auth/storage secrets.
- No Docker is needed. See [local runbook](LOCAL_RUNBOOK.md) and [test evidence](TEST_RESULTS.md).

Remaining production-service limitations: external email delivery, automatic backup retention, clinical operating policy and real payment processing. The public site is a synthetic demonstration, not an operational clinical service.
