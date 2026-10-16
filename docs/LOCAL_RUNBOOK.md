# Local Neon runbook

Docker is not used. The application runs on the laptop; its development database and private object bucket are on Neon.

## Run

- Install Node 22.23.2 and run npm.cmd ci.
- Copy .env.example to ignored .env.local and provide restricted application/authentication credentials, auth secret and branch-scoped storage credentials.
- Keep the migration owner and worker credentials exclusively in ignored .env.neon. Never copy them into the browser or GitHub.
- npm.cmd run dev starts local development at http://127.0.0.1:3000.
- For an optimized local review: npm.cmd run build, then npm.cmd run start.

Synthetic accounts: patient@careathome.test, provider@careathome.test, admin@careathome.test. The generated password is in ignored .env.demo. These are demonstration accounts only.

## Database and fixtures

npm.cmd run db:plan checks pending migration hashes without applying them. npm.cmd run db:migrate applies only pending authoritative migrations to the explicitly guarded development database. Do not reset the database.

npm.cmd run local:seed-accounts provisions missing synthetic accounts. npm.cmd run local:seed-care creates care fixtures only when demo visits are absent. Credentials are never printed by provisioning scripts.

## Verification

- npm.cmd run typecheck; npm.cmd run lint; npm.cmd test; npm.cmd run build
- npm.cmd run test:integration; npm.cmd run test:workflows; npm.cmd run test:storage
- With the local server running: npm.cmd run test:auth; npm.cmd run test:recovery
- PowerShell: set $env:PLAYWRIGHT_CHANNEL='chrome', then npm.cmd run test:e2e.

Integration tests retain labelled synthetic records for audit. They are not production migrations or real patient records.

## Development email

npm.cmd run local:notifications processes one batch into the encrypted development inbox. No external email is sent. Password recovery also writes to that inbox. External email delivery requires a separate provider configuration; the public demonstration does not send email.

## Recovery and retained references

The October 16 drill uses only the disposable recovery branch named recovery-drill-20261016. Its script is deliberately pinned to that target and must not be repointed at the application branch. Encrypted credential backup files live under ignored backups/. Keep the encryption secret separately from any copied backup.

Legacy Supabase/Docker scripts remain historical references and their dependencies are removed. They are not supported run commands. See TEST_RESULTS.md for the precise recovery evidence and remaining limitations.

The user authorised public synthetic Vercel deployment on October 16. See PROGRESS.md for its actual verification state.
