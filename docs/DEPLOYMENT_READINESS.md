# Deployment readiness

## Current release

The synthetic demonstration is deployed at https://careathome-platform.vercel.app using Vercel, Neon PostgreSQL, Better Auth and private Neon S3 storage. Source is private on GitHub. Docker is not required. Changes pushed to master trigger Vercel builds; migrations and environment configuration remain separate operations.

Verified release evidence is in [test results](TEST_RESULTS.md). [The review guide](REVIEW_GUIDE.md) explains account access and the user walkthrough.

## Before operational use

- Configure external email delivery and verify recovery/notification delivery and retry behavior. Current messages go to a private encrypted test inbox.
- Establish automated backup frequency/retention and repeat recovery exercises. The isolated recovery drill is evidence of recovery, not scheduled coverage.
- Complete concurrency/load, broader browser, keyboard and assistive-technology acceptance.
- Resolve clinical verification authority, consent, retention/jurisdiction, operational ownership and recipient-verification policy before handling real patient data.
- Real payments and external AI remain separate scope decisions. The deployed application uses simulated payments and labelled deterministic summaries.

Do not describe the demonstration as an operational clinical service or every SRS requirement as accepted. Never expose the private development inbox or owner credentials.
