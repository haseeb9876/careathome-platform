# Email OTP and Gmail setup

## Release status

Implementation and local acceptance are in progress. Gmail is configured privately in Vercel Production. The owner confirmed real email delivery and successful OTP sign-in on the staged deployment. Public promotion is in progress. Database migrations 011–016 are applied; compatibility handling preserves the existing deployed application's session policy until rollout.

## Verification policy

New sign-ins create restricted sessions. These cannot access care data, exports or privileged account operations until email verification succeeds. Registration signs in to this restricted verification screen. Existing sessions retain their original policy during the staged rollout and expire under the existing session rules. Public request fields cannot grant email or authenticator assurance.

Users can explicitly remember a private device for 30 days. The cookie is HttpOnly, Secure in production and SameSite=Lax; the database holds only its keyed digest. It does not replace authenticator MFA or authorize security changes. Password/email/MFA changes, account deactivation, role changes and session-revocation actions retire relevant remembered-device trust.

Fresh operation-bound email codes protect password changes, both stages of login-email changes, administrator invitation creation/acceptance/revocation, session revocation, MFA enrollment/disable/recovery-code replacement, administrator settings/account-access changes and self-service account closure. Codes include a session binding where applicable and a keyed digest of the specific submitted values. Account closure disables access and preserves retained care/audit records; active bookings must be resolved first and administrator closure requires a separate handover.

Administrator invitations and administrator settings/access changes also require current-password verification and enrolled, verified authenticator MFA. Administrators cannot disable their authenticator through the application. Supported MFA changes cannot use email as a substitute for existing authenticator verification. Lost-authenticator users retain the existing recovery-code sign-in path; there is no email-only MFA bypass.

Recovery verifies a code bound to the email and intended new password, retires all sessions and device trust, and retains any existing authenticator requirement. Recovery requests return a generic response; email dispatch runs after the response so SMTP latency/failures do not directly reveal account existence. Old public password-reset and sensitive Better Auth mutation endpoints are closed; supported mutations run through OTP-protected server actions. Existing URL-reset links direct users to OTP recovery.

## Code and delivery controls

- Cryptographically random six-digit codes; five-minute expiry; five incorrect attempts maximum.
- Atomic, single-use consumption with replay, purpose, recipient and context checks.
- HMAC-protected code storage, encrypted synthetic inbox, no codes in application logs or analytics.
- A 60-second recipient cooldown, ten requests per recipient/hour and thirty per source IP/hour. Real-recipient OTP requests additionally have a shared daily budget.
- All Gmail messages, including alerts and invitations, share an application budget of 300 send attempts per UTC day. This reserves some capacity but cannot guarantee Gmail delivery or account availability.
- Failed deliveries revoke the associated challenge. Recovery keeps its public response generic. Expired challenges older than seven days and expired device records are cleaned opportunistically on new OTP requests.
- `.test` recipients never leave the encrypted demonstration inbox, even with Gmail configured. Run `npm run local:inbox` privately to view these local messages; the generated inbox is ignored by Git and must not be shared.
- OTP screens support paste, mobile autofill, clear expiry/resend feedback, keyboard use and existing dark/light appearance. Security forms preserve inputs when verification fails.

## Owner setup: Gmail

1. For **haseebullahkhan5893@gmail.com**, enable Google 2-Step Verification and check that App passwords is available. Use [Google's App Password instructions](https://support.google.com/accounts/answer/185833?hl=en). Availability depends on account security settings.
2. Create a dedicated App Password for CareAtHome. Do not send the password in chat, put it in Git, or use the normal Gmail password.
3. Enter the following privately in the appropriate Vercel project's environment-variable settings:

   | Variable | Value |
   | --- | --- |
   | `EMAIL_DELIVERY` | `gmail` |
   | `GMAIL_USER` | `haseebullahkhan5893@gmail.com` |
   | `GMAIL_APP_PASSWORD` | The dedicated App Password, stored as a secret |

4. Redeploy after configuration. The Gmail adapter uses authenticated TLS SMTP on port 465 with bounded timeouts, a CareAtHome Security sender name, escaped HTML and plain-text alternatives. It cannot read mailbox messages.
5. Verify delivery to an owner-controlled real recipient and complete registration, sign-in, recovery and a sensitive operation. Check spam handling and failure/retry behavior before enabling the public release.
6. If moving the existing `.test` administrator to a real address, obtain its old-address OTP from the private local demonstration inbox, then verify the real destination inbox. Do not silently overwrite the administrator's credentials.

Personal Gmail has [sending limits and temporary sending restrictions](https://support.google.com/mail/answer/22839?hl=en-GB). An account-password change revokes Google App Passwords. Use a dedicated transactional service as traffic grows; this adapter preserves the existing Resend option. See [Nodemailer Gmail guidance](https://nodemailer.com/guides/using-gmail).

## Acceptance and maintenance

Run typecheck, lint, unit tests, build, `test:otp`, `test:account-security`, and the OTP/account-security browser suites against the optimized local build. These tests use disposable `.test` accounts, never print codes, and disable browser tracing for sensitive flows. Test-only cooldown acceleration is restricted to named disposable fixtures; production limits are unchanged.

`test:auth` checks that client input cannot forge assurance, sensitive public endpoints remain closed, and pending sessions cannot read private reports. `test:recovery` runs the browser OTP recovery scenario; set `PLAYWRIGHT_CHANNEL=chrome` when using installed Chrome and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` for an already running optimized server. The obsolete link-reset integration script has been removed. Broader existing role/care-flow browser tests need the new email-verification step or explicitly prepared trusted synthetic devices.

The dependency review found no production dependency advisories at this check. Five development-only advisories originate from the eslint/fast-glob/micromatch/braces chain; the proposed automated fix downgrades the Next ESLint configuration across major versions. That incompatible downgrade was not applied. Track an upstream compatible fix and do not accept untrusted lint patterns.

Design references: [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [OWASP password recovery](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), and the installed Better Auth/Next.js API documentation.
