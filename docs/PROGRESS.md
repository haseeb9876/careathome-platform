# Public release checkpoint ? October 16, 2026

Live: https://careathome-platform.vercel.app. Private GitHub source: haseeb9876/careathome-platform. Public access was checked without Vercel authentication. All 13 hosted Chrome scenarios passed across runs after correcting the missing Playwright PDF runtime; a separate hosted receipt PDF check passed. GitHub CI passed for commit 0298b20.

The first CLI source bundle included local-only files in private deployment storage. Public path checks returned 404. That deployment was removed. Explicit .vercelignore exclusions were added; replacement CLI source inspection found no local-only files (empty directory entries were excluded from that check). Subsequent deployment comes from the private GitHub repository, which excludes those files.

Updated warm local production measurement after HTTP migration: 15 sequential requests, median 751 ms, p95 829 ms. This is not a concurrent load test. See REVIEW_GUIDE.md for the review walkthrough and remaining service limitations. Final presentation-copy/documentation changes are being published next.

# CareAtHome progress ? October 16, 2026

The user authorised public Vercel deployment on October 16. Docker remains removed. GitHub source is private at haseeb9876/careathome-platform. Vercel project careathome-platform is created and linked to that repository; deployment and public acceptance are in progress, not yet complete.

## Implemented and verified

The application uses Neon PostgreSQL with restricted application, authentication and worker roles; Better Auth with password recovery, TOTP and backup codes; private Neon S3 credential storage. Ten migrations (000?009) are applied. Owner and worker secrets are excluded from the web runtime.

The responsive patient/provider/administrator workspace covers discovery, booking, eligibility and scheduling conflicts, credentials and verification, clinical records and amendments, reviewed reports and private sharing, simulated payments/refunds, reviews, support and notifications.

Evidence: 18 foundation checks; 59 care workflows (rerun successfully using the HTTP transaction adapter); 8 HTTP authentication checks; 3 password-recovery checks; 6 private-storage scenarios including a full 5 MiB signed transfer and overwrite denial; 33 unit tests. The earlier 12 Chrome scenarios passed across the original run and corrected reruns. These counts do not imply every SRS requirement has final acceptance.

The isolated backup drill restored the database checkpoint and verified encrypted object recovery. Twenty notification emails were captured in an encrypted development sink. There is no external email delivery or scheduled backup policy yet.

## Hosting changes under verification

Private credential transfers use short-lived signed S3 URLs after server authorization, preserving the 5 MiB allowance without passing file bytes through Vercel. File content is checked server-side before registration. Report and receipt PDFs use packaged Linux Chromium on Vercel and installed Chrome locally. Application queries use atomic Neon HTTP transactions with server-derived identity and RLS. Runtime secrets are being configured for production only.

## Remaining acceptance

Complete build and hosted browser checks, including sign-in, 5 MiB upload/download and PDF generation; measure performance after HTTP migration; update requirement evidence and push the source checkpoint. Public password-recovery email delivery remains unavailable until an email service is configured; the development sink must never be exposed publicly. Payments remain simulated and all demonstration data is synthetic. Automated accessibility scans do not establish full accessibility compliance.

The user's phrase ?other app? is awaiting clarification; no unrelated repository has been changed.
