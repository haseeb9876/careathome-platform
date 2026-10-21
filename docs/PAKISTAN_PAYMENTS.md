# Pakistan launch and payments

Working brand: **Sukoonara Care** — Expert care. The comfort of home.
Launch country: Pakistan; currency: PKR; timezone: Asia/Karachi.
Initial planning volume: 50 daily users. Five simultaneous users is an initial
engineering test target, not a measured capacity or a prediction from daily users.
Hosting budget remains undecided. The operating legal entity and trademark/domain
clearance remain pending. Existing URLs, Android package and authentication issuer
remain unchanged to preserve account and installed-app identity.

## What is implemented

- Server-created Safepay hosted checkout; no card fields or clinical information
  sent by this application. Only an opaque order ID and PKR amount are sent.
- Prices and patient ownership come from the database. Verified email OTP is
  required. Simulated and online payments cannot be attached to the same visit.
- Exact-body HMAC verification, merchant matching, amount matching, idempotent
  event processing and monotonic refund tracking. Browser return URLs do not
  confirm payment. Payment events never change visit status.
- Patient/admin payment history. Refunds are reviewed by support and initiated
  in the merchant dashboard; signed notifications update the application.
- Default mode remains `simulation`. Sandbox records are explicitly labelled.

This is an integration foundation, not provider certification or live acceptance.
No paid plan, merchant account or real charge was created by this work.

## Merchant setup (private settings only)

1. Create a [Safepay sandbox account](https://sandbox.api.getsafepay.com/).
   Obtain merchant onboarding approval before enabling live payments. Review the
   [onboarding requirements](https://safepay.helpscoutdocs.com/article/118-merchant-onboarding-form)
   and [website checklist](https://safepay.helpscoutdocs.com/article/79-website-checklist).
2. Use a dedicated sandbox deployment and database before provider acceptance.
   Set `APP_ORIGIN` to that deployment's exact HTTPS origin and configure:

   | Key | Value |
   | --- | --- |
   | `PAYMENT_MODE` | `safepay_sandbox` |
   | `SAFEPAY_PUBLIC_KEY` | Merchant API key beginning `sec_` |
   | `SAFEPAY_SECRET_KEY` | Merchant secret from Safepay |
   | `SAFEPAY_WEBHOOK_SECRET` | Webhook HMAC secret from Safepay |
   | `SAFEPAY_INTENT` | `CYBERSOURCE`, or `MPGS` if your merchant setup requires it |

   None of these keys use `NEXT_PUBLIC_`. Never paste secrets in chat or GitHub.
3. Configure the webhook URL as `https://YOUR-DEPLOYMENT/api/payments/safepay/webhook`.
   Subscribe to `payment.succeeded`, `payment.failed`, `payment.refunded` and
   `void.succeeded`. The endpoint requires `X-SFPY-SIGNATURE`.
4. Test successful, declined, abandoned and delayed payments; refresh/back/retry;
   duplicate callbacks; partial/full refunds; actual bank/merchant reconciliation;
   and mobile browser/Android handoff. Keep the evidence with the release.
5. Before live activation, finish the [production roadmap](PRODUCTION_ROADMAP.md),
   including legal operator, genuine support/refund terms, production separation,
   restore test and monitoring. Use live credentials and `PAYMENT_MODE=safepay_live`,
   `APP_DEPLOYMENT_MODE=production`, `PAYMENTS_LIVE_APPROVED=true` only after acceptance.
   These flags are guardrails, not substitutes for business/legal readiness.

## Operational limits requiring acceptance

- An uncertain tracker-creation request waits two minutes before retry; at most
  three initialization attempts. Orphaned trackers have no customer checkout link.
  Reconcile unresolved attempts with Safepay before taking another payment.
- Existing trackers are reused. Expired/cancelled terminal trackers require support
  reconciliation; automatic replacement is deliberately not implemented yet.
- A void displays `Needs review`, not an invented refund. Disputes, bank settlement
  reconciliation, automated refunds and legally compliant invoices are remaining
  merchant-operational work. Current history is a confirmation, not a tax invoice.
- A failed webhook write returns 503 for redelivery; unknown trackers are retried.
  Monitor delivery failures in Safepay. No raw webhook payload/card data is stored.
- Brand approval does not establish a registered healthcare operator. The public
  service stays a synthetic demonstration until production prerequisites pass.

Integration references: [hosted checkout](https://safepay-docs.netlify.app/build-your-integration/express-checkout/?platform=web),
[signature verification](https://safepay-docs.netlify.app/developers/webhooks/verify-hmac-signatures/),
[webhook types](https://safepay-docs.netlify.app/developers/webhooks/webhook-types/).
