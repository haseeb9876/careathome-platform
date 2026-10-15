# Test evidence

Evidence is scoped to the code and environment at the time of the run.

| Check | Observed result |
|---|---|
| October 14 foundation integration | 17 passed against actual local Auth/PostgreSQL/RLS/Storage |
| October 14 care workflows integration | 59 passed against actual local database |
| Synthetic care seed | 5 visits, 3 completed records, 3 simulated payments, verified demo nurse, support request |
| Local notification delivery | 20 delivered to Mailpit, 0 retryable failures in that cycle |
| October 15 unit tests | 12 passed |
| October 15 public Chrome Playwright | 4 passed, one worker, 1.7 minutes in development mode |
| Homepage responsive checks | No horizontal overflow at 390, 768, 1440 pixels |
| Homepage accessibility | axe WCAG A/AA: zero detected violations after eyebrow-text contrast correction |
| Production build during resume | Passed: all routes compiled and TypeScript passed |
| Final post-polish checks | Production build PASS; standalone TypeScript PASS; editor diagnostics clear. Full lint had no errors and one unused-import warning; import removed and focused lint passed without warnings. |
| Authenticated browser suite | Not accepted: earlier selectors/cold navigation failed; updated suite awaits runtime restoration |
| Migration 004 | Written, NOT applied or database-tested |
| MFA, credential expiry renewal, worker retry/restart | Still require dedicated integration evidence |
| PDF export/browser source fidelity | Written, not accepted yet |
| Auth session inactivity/timebox | Configured, requires runtime restart and verification |
| Backup/recovery/persistence restart | Script prepared; not executed/accepted |
| Performance p95 target | Not measured; cold development timings do not establish performance compliance |

## Care workflow suite coverage
Provider application/credential review and private access; pending/verified transitions; discovery; invalid/overlapping availability; concurrent assignment (exactly one winner); travel buffer, profession, area and time-off checks; protected availability; independent and idempotent payments/refunds; rescheduling history and price preservation; cancellation cutoff; assigned-provider start/completion; terminal states; patient/admin clinical access boundaries; immutable records and author-only amendments; completed-only unique reviews and moderation; report snapshots with amendments; review-before-sharing; hashed tokens, expiry/revocation/access logs; support ownership/resolution; suspension/reassignment; in-app notifications; worker role restrictions.

## Reproducible commands
- npm.cmd test
- npm.cmd run typecheck
- npm.cmd run lint
- npm.cmd run build
- npm.cmd run test:integration
- npm.cmd run test:workflows
- PowerShell: $env:PLAYWRIGHT_CHANNEL='chrome'; npm.cmd run test:e2e
- npm.cmd run review:visual
- npm.cmd run local:recovery-drill (only after runtime restoration; isolated targets retained)

Screenshots and homepage accessibility evidence are under [screenshots](./screenshots/). Automated accessibility checks do not replace keyboard, screen-reader and human visual review. Firefox/WebKit are not yet tested.

The five high-severity dependency audit entries reported earlier are in the development lint dependency chain. No forced dependency downgrade was performed.



