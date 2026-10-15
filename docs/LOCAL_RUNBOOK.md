# Local runbook

Run commands from the project folder with Node 22.23.2 and npm.cmd on Windows. Do not reset local data to troubleshoot.

## Current environment
The app source, installed dependencies, ignored .env.local and .env.demo are present. The local Supabase runtime ran successfully October 14, but is stopped on October 15 and the previous Docker executable is missing. Restore the existing installation/runtime before relying on login, persistence or care workflows. Do not install a cloud substitute or create application images.

## Resume existing data
1. Locate/restore the existing local runtime and start the existing Supabase services without resetting volumes.
2. Confirm local API 54321, PostgreSQL 54322 and Mailpit 54324 respond.
3. Apply pending SQL with npx.cmd supabase migration up --local.
4. Restart local Auth services using the existing configuration to activate auth.sessions inactivity_timeout=30m and timebox=24h; verify these settings rather than assuming activation.
5. npm.cmd run test:integration and npm.cmd run test:workflows.
6. npm.cmd run dev; open http://127.0.0.1:3000.
7. In another local terminal: npm.cmd run local:notifications (polls every 30 seconds).
8. Inspect local notification/recovery mail at http://127.0.0.1:54324.

No external emails are sent by the local worker. Delivery retries are stored separately from bookings. Repeated delivery after a worker crash can still occur at the mail boundary; Message-ID is stable and application notifications are deduplicated.

## Demo access
Synthetic accounts: patient@careathome.test, provider@careathome.test, admin@careathome.test.
Their generated shared password is in ignored .env.demo. Do not put the password in tracked documentation or screenshots.
The patient has care-history examples; the nurse has a verified synthetic profile and upcoming availability. Every credential/profile is demonstration-only.
Do not rerun provisioning if .env.demo already exists. The care seed deliberately leaves existing bookings unchanged.

## Local application commands
- npm.cmd run dev — development app, loopback only.
- npm.cmd run build — local optimized web build; not deployment or a Docker image.
- npm.cmd start — run that local build on port 3000 after stopping the development server.
- npm.cmd run local:notifications — local outbox/reminder worker.
- npm.cmd run review:visual — homepage screenshots and axe report under docs/screenshots.
- npm.cmd run local:backup — archive PostgreSQL and export private objects separately.
- npm.cmd run local:recovery-drill — additionally restore to a NEW isolated database and private bucket, compare counts/hashes, retain targets for inspection. Never overwrites the application database.

Backup scripts expect the existing supabase_db_careathome-platform container and docker CLI, optionally LOCAL_DOCKER_BIN. LOCAL_DATABASE_URL defaults to the standard local PostgreSQL connection. Backups contain sensitive local data and are ignored. Run while application writes/workers are paused so database and object snapshots represent the same quiet period. Recovery code is prepared but has not passed a drill yet.

## Verification
npm.cmd run typecheck; npm.cmd run lint; npm.cmd test; npm.cmd run build.
PowerShell browser command: $env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd run test:e2e.
Authenticated browser tests require the real local services and the synthetic demo fixtures; do not replace them with mock login.

Ports: app 3000, local API 54321, PostgreSQL 54322, shadow database 54320, Mailpit 54324. No production or hosted fallback.

