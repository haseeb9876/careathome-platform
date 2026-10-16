# Maintaining CareAtHome

## Start here

Read [architecture](ARCHITECTURE.md), [current progress](PROGRESS.md), [requirements](REQUIREMENTS_MATRIX.md) and [local setup](LOCAL_RUNBOOK.md). The public demonstration is https://careathome-platform.vercel.app. GitHub master is connected to Vercel production.

## Where changes belong

| Concern | Location |
| --- | --- |
| URL entry points, layouts, loading/error states | `src/app/` |
| Dashboard screen rendering and role visibility | `src/modules/care/screens/`; add a screen and its roles to `registry.ts` |
| Care form schemas and procedure mapping | `src/modules/care/action-definitions.ts` |
| Validated mutation dispatch and report sharing | `src/modules/care/actions.ts` |
| Private credential upload authorization/content validation | `src/modules/care/credential-actions.ts`, `src/lib/database/storage.ts` |
| Login, MFA, account/session checks | `src/modules/accounts/`, `src/lib/database/auth-*.ts` |
| Booking input and creation | `src/modules/bookings/` |
| Reusable visual components | `src/components/` |
| Ordered styles | `src/styles/`; imported by `src/app/globals.css` |
| Restricted data adapter and HTTP identity transaction | `src/lib/database/` |
| Authoritative schema, policies and procedures | `database/migrations/` |
| Local operations and synthetic fixture tooling | `scripts/` |

Keep route files thin. Put a new feature beside its domain, reuse established components and validate on the server. Screen access lists improve navigation; they never replace database RLS/procedure authorization. Do not introduce a second database client, identity system or upload implementation.

## Validate and publish

1. Implement a focused change and inspect its diff. Avoid unrelated formatting of large files.
2. Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build`. Lint fails on warnings to catch unused imports/variables early.
3. Run relevant Neon integration checks when changing authorization, procedures, storage or data access. Tests retain labelled synthetic fixtures; never point them at real patient data.
4. With an optimized local server running, run relevant Chrome tests. `PLAYWRIGHT_BASE_URL` targets the public demonstration for post-deploy checks; otherwise tests use localhost. Do not run tests against a deployment containing real data.
5. Commit and push to master only after the local checks pass. Vercel deployment and GitHub checks currently run independently; GitHub CI is not a deployment gate.
6. Wait for Vercel Ready and inspect the same public URL. Record actual results and unresolved limitations in TEST_RESULTS.md and PROGRESS.md.

For a schema change, add a NEW numbered SQL migration. Never edit applied migrations: the runner checks their hashes. Review backward compatibility and apply to the approved Neon target before publishing code that requires it. Destructive schema changes need a staged plan. `db:plan` only validates the target; it is not a SQL diff preview. GitHub pushes do not apply migrations automatically.

Update production environment variables in Vercel and redeploy when configuration changes. Never commit secrets. Owner and worker database credentials do not belong in the web runtime.

## Files that must remain private

Ignored environment files, credentials, local inbox, backup files and the original SRS are intentional local assets. Do not remove them as generic cleanup. Dependencies and `.next` are regenerable local tooling/build output; they are not browser payload. Explicit `.vercelignore` rules prevent local-only assets from entering CLI deployment bundles.

Legacy Supabase scripts/configuration, old integration suites and one-time migration generators were removed after the Neon migration. Recover historical references from Git if needed; do not reintroduce them into the active runtime. The Neon runtime-role provisioning tool is retained for setup and refuses accidental password rotation. The recovery drill script is pinned to its disposable test branch and is not a general restore command.
