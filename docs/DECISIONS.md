# Decisions and SRS reconciliation

The user selected Neon, GitHub and Vercel, removed Docker, and authorised public demonstration deployment on October 16, 2026. The private source repository is haseeb9876/careathome-platform. Use free development services and synthetic data.

| Topic | Current decision |
| --- | --- |
| Platform | Responsive Next.js/TypeScript web app with PWA installation. Android TWA preparation and production-readiness work authorized October 20; final Play identity/signing and physical-device acceptance pending. Separate iPhone App Store/native clinical-offline clients remain undecided. |
| Identity | Patient, provider (nurse/physiotherapist), administrator. No separate doctor/platform-owner account. Better Auth with Neon. |
| Assignment | Administrator assigns; no autonomous assignment or provider acceptance step. |
| Packages | Multi-session care packages deferred by user brief (FR-031/041). |
| Payments | Real payments authorized October 21 for Pakistan. Safepay hosted-checkout preparation; merchant onboarding/sandbox acceptance/live activation pending. Simulation remains isolated. |
| Summaries | Labelled deterministic template; external AI requires separate scope/data handling decisions (FR-056-063). |
| Cancellation | Default 24-hour patient cutoff, configurable; administrator override needs a reason. Rescheduling revalidates eligibility/conflicts. |
| Scheduling | Configurable travel buffer, not route estimation. Credential expiry enforced by default. |
| Locale | English, Asia/Karachi and PKR initially; timezone choices include UTC/Dubai. |
| Clinical scope | Synthetic demonstration; human credential review. Operational jurisdiction/verification authority unresolved. |
| Emergency contact | Conditional on supervisor approval (FR-010); not collected by default. |
| Recommendations | Automated recommendations and override workflow deferred (FR-048/049, BR-009). |
| University formatting | External requirement; original supplied documents remain unchanged. |

Completed and Cancelled are terminal booking states. Registration never grants administrator authority. Administrative accounts do not automatically gain clinical-record access. Reports require source review before export/sharing; private links expire and can be revoked, while recipient identity verification remains an operational decision.

Verified-profile edits return the application to Pending and release future confirmed visits. Rejected profiles can edit/resubmit. Suspended profiles require administrator review. Failed summaries never alter source records or send data to external AI.

Supabase/Docker was the initial implementation and was replaced by Neon. Historical files are recoverable from Git; current migrations under database/migrations are authoritative. Applied migration contents are immutable.
