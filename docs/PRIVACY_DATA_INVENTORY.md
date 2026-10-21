# Privacy and deletion preparation — not a published privacy policy

This inventory describes the current demonstration architecture to support the owner's production policy decisions. It is not legal approval, a promise of a retention period, or a completed Google Play Data safety form.

| Data category | Current purpose | Preparation before real-patient launch |
|---|---|---|
| Account name/email, password hash, role and profile | Authentication, contact and role authorization | Confirm operating organization, contact and lawful processing basis |
| Session/device records, hashed OTP challenges, MFA material | Account protection and recovery | Document expiry, housekeeping, access and incident handling |
| Patient visit address, contact/profile details, bookings | Deliver and coordinate home care | Establish consent, access boundaries and retention schedule |
| Provider profiles, credentials and uploaded documents | Eligibility and human review | Name the verification authority, review process and retention |
| Authored care records, amendments and generated summaries | Care history and reviewed exports | Approve clinical retention and correction/deletion handling |
| Simulated payments/refunds and reviews | Demonstrate finance and feedback workflows | Decide real gateway and moderation scope before activation |
| Support tickets, notifications and security/audit records | Support, reminders and accountability | Assign response ownership and justified retention |
| Report-sharing tokens | Expiring/revocable access to reviewed reports | Confirm sharing consent and recipient-verification policy |

Current processors include Vercel (application), Neon (database/private storage), Gmail SMTP or the configured email adapter, and GitHub (private source/builds). GitHub is not intended to store patient records or production secrets in source. Android TWA content is rendered by the user's supporting browser. The current mobile package adds no advertising or analytics SDK.

## Account closure is not account/data erasure

Current closure requires password and OTP, rejects unresolved bookings and administrator handover cases, disables access, retires sessions and preserves care/audit history. Do not label this as complete data deletion.

The production deletion workflow must:

1. Provide discoverable in-app and external-web request routes, including users who no longer have the app.
2. Verify identity without exposing whether an arbitrary email has an account.
3. Track requests, responsible staff, decisions and fulfillment.
4. Delete eligible account-associated data and stored files, and explain justified retained categories and periods.
5. Address processors and backup expiry; avoid restoring deleted data into active service accidentally.
6. Provide confirmation/support and test both authorized and malicious requests.

The owner must approve the organization, support contact, launch jurisdiction and retention/deletion schedule before these become public promises. Existing clinical/audit records must not be bulk-erased based on a guessed policy.

## Play preparation

The Health declaration, Data safety answers, privacy policy, account-deletion URL and store identity must match the actual deployed behavior and configured processors. Test/reviewer accounts must contain synthetic data only. Final signed Android releases must undergo device and Play-track acceptance.

References: [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [Health declaration](https://support.google.com/googleplay/android-developer/answer/14738291), [Organization account](https://support.google.com/googleplay/android-developer/answer/13634885).
