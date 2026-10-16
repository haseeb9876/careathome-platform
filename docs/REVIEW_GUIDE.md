# Review CareAtHome

Public application: https://careathome-platform.vercel.app

This is a synthetic demonstration. Do not enter real patient information or payment details. No Docker or local server is needed to open the hosted application.

## Access

Create a patient account from the sign-in page to try registration and bookings. Existing synthetic accounts are patient@careathome.test, provider@careathome.test and admin@careathome.test. Their generated password is stored only in the ignored local `.env.demo` file. Do not publish those credentials or add them to this guide.

## Walkthrough

1. Explore the home page, services and provider directory at desktop and phone widths.
2. Patient: request a visit, edit profile, inspect booking history and cancellation, open care records, review a report, download its PDF, create a private link and revoke it.
3. Provider: edit professional details, submit a credential, manage availability/time off, inspect assigned visits and enter session records. Upload supports PDF/JPEG/PNG up to 5 MiB.
4. Administrator: review provider evidence, verify/reject/suspend applications, queue and assign visits, manage services/accounts, review simulated payments/refunds, moderate reviews and answer support requests.
5. Review security settings, authenticator enrollment, notifications and audit history. Registration never grants administrator access.

## Current cleanup release

The code has been modularized and legacy tooling removed; see [maintenance guidance](MAINTENANCE.md). Core/static regression passes. Current 5 MiB credential transfers encountered timeouts and a Neon storage HTTP 500 despite passing in the earlier release. The upload UI now stops after 90 seconds and offers a retry. Treat large-upload acceptance as open until the storage issue is resolved; see [latest results](TEST_RESULTS.md).

## Previous verified hosted behavior

All 13 Chrome scenarios passed across hosted runs after the PDF packaging correction. Coverage includes patient registration/booking/profile/cancellation/logout; provider registration; administrator booking queue; public layouts at 390/768/1440; protected-page redirect; all three role workspaces and mobile navigation; report PDF/sharing/revocation; responsive home/patient accessibility scans; 5 MiB credential upload/download and disguised-content rejection. A separate hosted payment receipt PDF check also passed.

## Remaining limitations

External recovery/notification emails are not sent; they are captured in a private development inbox. Payments are simulated. Automatic backup scheduling, broader load testing and Firefox/WebKit/manual accessibility acceptance remain open. Optional/deferred SRS features, including native apps, care packages and automated provider recommendations, are recorded in the requirements matrix. This guide does not declare every SRS item accepted.
