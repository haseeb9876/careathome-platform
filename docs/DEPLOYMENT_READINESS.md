# Deployment readiness

NOT READY. Local development only; no deployment or remote repository authorised.

Outstanding gates: full SRS acceptance, database concurrency and RLS tests, credential review/content validation, admin MFA, abuse controls, clinical policy review, jurisdiction/retention/consent, backup and restore, notification delivery policy, TLS/security headers/CSP review, observability, operational ownership, report recipient verification decision, accessibility/browser/performance checks.

Real AI and real payments require separate opt-in scope and data-handling decisions. Never upload patient data to external AI. Any future gateway must keep payment status separate and enforce idempotency.

Before GitHub handover: confirm repository and visibility, review tracked/untracked files and secrets, use existing secure authentication, validate setup from a fresh clone. Private PDF, uploaded records, .env files, dumps and generated reports remain ignored.

## Local implementation progress
Database concurrency/RLS workflows now have 17 foundation and 59 care integration passes from the October 14 local runtime. This does not remove final regression, browser, MFA, recovery, performance or production policy gates. The current runtime is stopped and must be restored before additional acceptance evidence can be collected. No deployment has been requested or performed.
