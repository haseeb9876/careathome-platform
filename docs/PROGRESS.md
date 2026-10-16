# Current progress

Public demonstration: https://careathome-platform.vercel.app. Private source: haseeb9876/careathome-platform. Vercel automatically deploys master. No Docker.

## SRS usability release

Re-read the supplied 40-page SRS and documented all fourteen acceptance criteria in [SRS_REVIEW.md](SRS_REVIEW.md), with primary W3C/NHS design references and explicit operational dependencies. Improved booking validation/error recovery, review details and state explanations; mobile focus/keyboard/skip navigation; form readability; provider filter validation, results and failure feedback. Retired identified old test providers/services from public discovery through audited procedures while preserving history.

36 unit tests and 59 live Neon workflows passed. Fourteen Chrome scenarios have passing evidence across the optimized suite and the corrected patient-journey rerun. Initial failures and exact limitations are in [TEST_RESULTS.md](TEST_RESULTS.md). Release `15e79b4` passed GitHub checks and deployed to the public Vercel alias; all seven targeted hosted Chrome scenarios passed in 1.3 minutes. The next operational step is a verified outbound email provider/domain, followed by scheduled backup/retention configuration and broader nonfunctional acceptance. Conditional scope remains open; this does not declare complete clinical or stakeholder acceptance.

## Cleanup release

Removed retired Supabase configuration, migrations, scripts and integration suites from the active tree; their history remains in Git. Applied Neon migrations 000-009 are unchanged. Removed the unused application pool, superseded upload action, duplicate visual capture tool, obsolete matrix generator and unused Nodemailer packages.

Split dashboard rendering into fourteen named screen modules with an explicit role registry. Extracted action validation/procedure definitions from server action execution. Split the global stylesheet into six ordered stylesheets; parsed CSS rules and declaration order were checked to be identical. Private local environment, backup and SRS files are preserved.

The maintenance guide describes ownership, setup, migrations, verification and deployment. Static checks, zero-warning lint, 33 unit tests, optimized build and 59 Neon workflows pass. Twelve of thirteen Chrome scenarios passed across local runs; administrator access passed on retry. Cleanup commit 0ffc743 is deployed and GitHub CI passed. On resume, all six private-storage scenarios passed, including the 5 MiB signed transfer, overwrite protection and unauthorized access checks. The targeted public Chrome credential journey also passed in 40.4 seconds, including byte-exact download and disguised-content rejection. The earlier failure was intermittent; its root cause is not established, and the 90-second timeout/retry guidance remains. All five hosted role/report/accessibility scenarios passed. See TEST_RESULTS.md for detailed evidence. The requested cleanup is complete and its previously blocked upload scenario now has a successful hosted rerun. Continue monitoring storage reliability; the next product steps are the service/acceptance items below.

## Existing verified functionality

The previous release passed 13 hosted Chrome scenarios plus receipt PDF export, 59 Neon care-workflow checks, 18 foundation checks, 8 HTTP auth scenarios, 3 recovery checks, 6 private storage scenarios and 33 unit tests. Those results predate the current refactor and are regression baselines.

## Remaining product/service work

External email transport, scheduled backups, broader performance/browser/accessibility acceptance and the conditional/deferred SRS features remain open. Payments are simulated and summaries deterministic. The phrase "other app" still needs a project name/path before work can begin in another repository.
