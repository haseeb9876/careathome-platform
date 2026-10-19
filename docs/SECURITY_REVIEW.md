# Security review — October 19, 2026

Scope: automatic sign-in email verification, dashboard transition, public request boundaries, authentication throttling and browser restrictions. This is a focused engineering review of the synthetic demonstration, not a penetration-test certification or a guarantee against every attack.

## Changes

- Sign-in codes send automatically. Refresh reuses a delivered, unexpired challenge bound to the same account and session; expiry enables an explicit resend. Verification remains single-use with server-enforced attempt limits. Parallel initial requests remain subject to the database cooldown.
- Successful verification loads a fresh dashboard document, discarding prefetched pending-session routes. The informational sign-in email runs after the response, so SMTP latency does not block the dashboard.
- Authentication JSON is limited to 8 KiB and share requests to 1 KiB, counting actual stream bytes rather than trusting Content-Length. Existing 6 MiB server-action uploads retain their separate limits and validation.
- Password-check throttling uses the session identity; extra email/token fields cannot choose another bucket. MFA disable and recovery-code generation join the protected operations. Hosted authentication additionally shares a database-backed 60-attempt/minute source-IP budget across accounts and operations, alongside the existing account and Better Auth limits. This is not a general application-wide traffic limiter.
- Global response headers prohibit framing, embedded objects, foreign form destinations and unused camera/microphone/location/payment/USB permissions. The service worker retains its more restrictive policy. Authentication session responses explicitly prohibit caching.

## Existing protections checked

Database tests exercise privileged-role separation, invitation authority, ownership, audit records, session retirement, recipient/action/context binding, five-attempt exhaustion, expiry, revocation and concurrent OTP consumption. HTTP checks cover forged assurance fields, direct sensitive-auth endpoint bypass and private report access before verification. Browser tests cover account changes, invitations, MFA, remembered devices and recovery. Exact results and release status are in [TEST_RESULTS.md](TEST_RESULTS.md).

The production dependency audit reported zero known advisories on October 19. This does not establish absence of vulnerabilities. Previously recorded development-only ESLint transitive advisories remain tracked in [EMAIL_OTP.md](EMAIL_OTP.md); an incompatible major-version downgrade was not applied.

## Remaining work and limits

- The baseline CSP does not yet restrict all script sources. A nonce-based strict script policy needs a separate rendering, caching and PWA compatibility pass.
- Configure and exercise scheduled database/object backups, retention, restore monitoring and reminder workers. The prior isolated restore drill is not a scheduled backup service.
- Establish ongoing abuse/error monitoring and an incident response owner; assess WAF/rate-limit behavior under realistic shared networks and distributed abuse. Multi-user NATs share the hosted source budget.
- Complete physical iPhone/Android acceptance, broader browser/manual accessibility checks and measured load tests. No claim of complete SRS acceptance is made.
- Gmail inbox placement is controlled by recipient filtering. The configured sender works, but guaranteed inbox delivery and production-scale transactional delivery are not established.
- Existing staged-policy legacy sessions expire under the 24-hour application limit; new sessions explicitly require the OTP policy. Clinical production use, real payments and external AI remain outside this demonstration's accepted scope.

## References

- [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP credential-stuffing prevention](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
- [Vercel request headers](https://vercel.com/docs/headers/request-headers)
- [Next.js response headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)

Framework behavior was also checked against the installed Next.js documentation before implementation.
