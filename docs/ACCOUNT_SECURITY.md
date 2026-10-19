# Account security

## Using the controls

These sensitive operations now also require a fresh email OTP. Enter the requested details, request the code, then submit it with the operation. Email changes verify both addresses, and invitation acceptance verifies the recipient. See [EMAIL_OTP.md](EMAIL_OTP.md) for the current policy.

- Open **Settings & security → Change password**. Enter the current password and a new password of 12–128 characters. Success signs out every session, including the current one.
- In **Your login email**, enter a new address and the current password. Confirm the delivered link while signed into the original account. The original email remains active until confirmation; confirmation signs out all sessions. Links expire after 30 minutes and can be cancelled.
- An administrator opens **Users → Invite an administrator** after enrolling and verifying two-step security. Enter a new, dedicated email and the current password. The recipient follows the 24-hour invitation and chooses their own password. Invitations can be revoked, cannot be reused and lose authority if the sender is deactivated. Public registration cannot choose the administrator role.
- **Where you’re signed in** lists active sessions without exposing their tokens. The user can revoke one or all other sessions after confirming their password. Browser descriptions are approximate.

## Delivery configuration

The default is an encrypted demonstration inbox. Reserved `.test` recipients never leave that inbox, even when real delivery is configured. The UI explains this limitation. Real-address changes and invitations are refused until delivery is configured.

Production uses the owner-configured Gmail SMTP adapter. Real Gmail OTP delivery and sign-in were confirmed on October 19. Credentials are stored privately in Vercel; never put them in Git or chat. The Resend adapter remains available for a future transactional sender. See [Gmail setup and limits](EMAIL_OTP.md).

## Implementation and review

[Migration 010](../database/migrations/010_account_security.sql) is applied and immutable. Token hashes, expiry, consumption and revocation are enforced through authentication-service-only database functions. The application database role and anonymous role cannot invoke them or read the underlying tokens. Sensitive actions check active sessions, ownership, current passwords and enrolled MFA. Administrator invitations always require verified MFA. Changes and invitation actions are audited.

Verification links carry the random token in the URL fragment to keep it out of normal page-request URLs. The browser submits it to a server action. Passwords use Better Auth’s hashing implementation. Verification tokens are single-use; concurrent invitation acceptance has a single winner. Password/email changes invalidate outstanding email-change links.

Security decisions follow [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP session management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Better Auth account APIs](https://better-auth.com/docs/concepts/users-accounts) and [Resend domain verification documentation](https://resend.com/docs/dashboard/domains/introduction).

## Remaining quality and SRS acceptance work

| Priority | Remaining work | Acceptance evidence needed |
| --- | --- | --- |
| 1 | Monitor email delivery and broaden recipient coverage | Gmail OTP delivery/sign-in confirmed; continue checking spam placement, delivery failures and real invitation/recovery messages across mailbox providers |
| 2 | Schedule reminder processing and backup/retention operations | Scheduled execution, monitoring, retry and a fresh restoration drill |
| 3 | Physical Android/iPhone PWA acceptance | Installation, home-screen icon, sign-in, theme and update behavior on real devices |
| 4 | Broader browser/accessibility/performance acceptance | Firefox/WebKit, keyboard and assistive technology review, realistic concurrent-load measurements |
| 5 | Monitor large credential transfers | Explain intermittent local transfer timeouts; retain hosted byte-exact upload/download checks |
| Conditional | Real payments, external AI and other deferred SRS scope | Separate scope and service decisions; current payments and summaries remain synthetic |

The existing [SRS review](SRS_REVIEW.md), [requirements matrix](REQUIREMENTS_MATRIX.md) and [test results](TEST_RESULTS.md) distinguish implemented behavior from complete stakeholder acceptance. This release improves account administration and session control; it does not declare every conditional SRS item complete.
