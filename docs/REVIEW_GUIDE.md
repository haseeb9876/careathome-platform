# Review CareAtHome

The email OTP upgrade passed local security acceptance, and the owner confirmed real Gmail delivery and OTP sign-in. Public promotion is in progress; current release evidence is in TEST_RESULTS.md. See [owner setup and OTP review](EMAIL_OTP.md).

Public application: https://careathome-platform.vercel.app

This is a synthetic demonstration. Do not enter real patient information or payment details. No Docker or local server is needed to open the hosted application.

## Access

Create a patient account from the sign-in page to try registration and bookings. Existing synthetic accounts are patient@careathome.test, provider@careathome.test and admin@careathome.test. Their generated password is stored only in the ignored local `.env.demo` file. Do not publish those credentials or add them to this guide.

## Walkthrough

Account administration: open **Settings & security** to change your password, request a verified login-email change or sign out other sessions. Administrators can open **People & access** to invite a separate administrator after verifying two-step security. Invitations expire and can be revoked. Real email delivery still needs a verified sender; `.test` messages stay in the encrypted demonstration inbox. See [account security and remaining acceptance work](ACCOUNT_SECURITY.md).

Open **Appearance settings** in the header (the sliders icon on mobile). Try Light, Dark and System, then enable Larger text. Refresh and open another tab to check the saved preference. Theme changes should preserve unfinished forms. These controls are also in each role's **Settings & security** screen. See [appearance guidance](APPEARANCE.md).

For mobile installation, open the website in Chrome on Android or Safari on iPhone. The first-visit panel provides installation guidance; [PWA.md](PWA.md) explains installation, automatic delivery on reopening, and safe refresh of an already-open app. Care functions require internet. Physical phone acceptance is still needed.

For the current SRS review, see [SRS_REVIEW.md](SRS_REVIEW.md). In particular, try a past booking date, correct it, review the cancellation policy and use the mobile menu with Tab and Escape. Booking failures should retain your entered details. The provider directory now explains invalid filters separately from no matching results.

1. Explore the home page, services and provider directory at desktop and phone widths.
2. Patient: request a visit, edit profile, inspect booking history and cancellation, open care records, review a report, download its PDF, create a private link and revoke it.
3. Provider: edit professional details, submit a credential, manage availability/time off, inspect assigned visits and enter session records. Upload supports PDF/JPEG/PNG up to 5 MiB.
4. Administrator: review provider evidence, verify/reject/suspend applications, queue and assign visits, manage services/accounts, review simulated payments/refunds, moderate reviews and answer support requests.
5. Review security settings, authenticator enrollment, notifications and audit history. Registration never grants administrator access.

## Current cleanup release

The code has been modularized and legacy tooling removed; see [maintenance guidance](MAINTENANCE.md). Static checks, unit tests, database workflows and core browser regression passed. The previously failing 5 MiB transfer passed both the private-storage suite and a targeted public Chrome rerun, including byte-exact download and disguised-content rejection. Earlier intermittent timeouts/HTTP 500 responses are retained in [latest results](TEST_RESULTS.md); their underlying cause is unconfirmed. Uploads stop after 90 seconds and offer retry guidance.

## Previous verified hosted behavior

All 13 Chrome scenarios passed across hosted runs after the PDF packaging correction. Coverage includes patient registration/booking/profile/cancellation/logout; provider registration; administrator booking queue; public layouts at 390/768/1440; protected-page redirect; all three role workspaces and mobile navigation; report PDF/sharing/revocation; responsive home/patient accessibility scans; 5 MiB credential upload/download and disguised-content rejection. A separate hosted payment receipt PDF check also passed.

## Remaining limitations

External recovery/notification emails are not sent; they are captured in a private development inbox. Payments are simulated. Automatic backup scheduling, broader load testing and Firefox/WebKit/manual accessibility acceptance remain open. Optional/deferred SRS features, including native apps, care packages and automated provider recommendations, are recorded in the requirements matrix. This guide does not declare every SRS item accepted.
