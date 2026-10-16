# SRS and usability review ? October 16, 2026

Reference: the supplied 40-page CareAtHome SRS v1.1 draft. The private PDF is preserved unchanged. This review separates implemented behavior, executed test evidence, operational dependencies and conditional scope. It is not a claim of clinical readiness or formal stakeholder acceptance.

## Improvements in this release

- Booking errors preserve the patient's date, service and address in component memory, without putting addresses into URLs or browser storage. Server authorization and database pricing remain authoritative.
- Calendar validation rejects rollover dates, past visits and dates beyond 180 days using the configured service timezone. The review shows duration, price, location, timezone and the configured cancellation cutoff.
- Wizard steps announce the current step and move keyboard focus to its heading. Server errors receive focus and offer a direct route back to edit details. An unavailable catalogue has an explicit empty state; query failures use the retry boundary.
- Mobile navigation traps focus while open, closes with Escape, restores focus, blocks background interaction and hides closed links from keyboard navigation. The skip link targets the workspace's main content.
- Larger input text, readable supporting copy, 44-pixel action targets and reduced-motion support improve patient usability without adding dependencies.
- Provider search validates every filter, preserves selections, uses the configured currency, explains invalid input and distinguishes a service failure from zero results. Booking from a filtered provider retains the selected service when supported.
- All seven booking states have plain-language explanations of what happens next.

## SRS acceptance evidence map

This map supplements the detailed [requirements matrix](REQUIREMENTS_MATRIX.md). Database coverage does not substitute for every administrative button being manually accepted.

| Criterion | Implemented path and evidence | Acceptance limit |
| --- | --- | --- |
| AC-01 Registration, login, profile | Patient browser journey and authentication suites | External recovery email delivery remains open |
| AC-02 Provider registration and credentials | Pending-state browser journey, private storage checks, hosted credential upload rerun | Earlier intermittent storage failures remain recorded |
| AC-03 Administrator verification decisions | Care integration: verification prerequisites, rejection/suspension rules and audit data | Full manual decision-screen acceptance outstanding |
| AC-04 Unverified providers cannot receive assignments | Care integration rejects pending providers and invalid credentials | Operational credential verification authority unresolved |
| AC-05 Discovery and booking | Directory filters plus patient request browser journey | Current release adds invalid-filter and failed-request recovery assertions |
| AC-06 Availability management | Availability, overlap, time-off and confirmed-visit protection checks | Full human usability acceptance outstanding |
| AC-07 Conflict protection | Concurrent requests permit exactly one conflicting assignment; travel buffer enforced | Not a capacity/load benchmark |
| AC-08 Cancellation and reassignment | Patient cancellation journey; cutoff, reschedule history and suspension reassignment integration checks | Administrative override requires a reason |
| AC-09 Records | Atomic completion, immutable authored record, amendments and ownership tests | Synthetic records only |
| AC-10 Summaries | Deterministic labelled snapshots; source review, PDF, expiry and revocation coverage | External AI remains conditional |
| AC-11 Payment separation | Simulated payment idempotency, refunds and independent booking/payment states | No real gateway |
| AC-12 Reviews | Completed-visit prerequisite, duplicate prevention and public moderation checks | Full moderation UI acceptance outstanding |
| AC-13 Role restrictions | Database ownership/role suites and three role workspace journeys | Broader security assessment remains distinct |
| AC-14 Invalid input and failures | Unit validation, auth/ownership failures, storage content rejection; booking/search recovery tests | Does not prove every infrastructure failure mode |

## Remaining release dependencies

1. Connect a verified outbound email service before describing password recovery as publicly deliverable. Development recovery uses an encrypted test inbox. The user has been asked for provider/domain information only.
2. Establish scheduled database and object-storage backups, retention and monitoring. An isolated restore drill passed previously; a drill is not an automated backup schedule.
3. Agree the operating jurisdiction, credential-review authority and clinical policies before using real patient information. This deployment remains a clearly labelled synthetic demonstration.
4. Complete stakeholder acceptance, assistive-technology review, additional browsers and a defined concurrent performance benchmark. The SRS's response-time objective cannot be established by a small sequential sample.
5. Optional/conditional items retain the decisions in [DECISIONS.md](DECISIONS.md): emergency contacts need approval; packages, autonomous recommendations, external AI, SMS, native apps and a real gateway are not silently marked complete.

## Design evidence

- [W3C: older users and accessibility](https://www.w3.org/WAI/older-users/): use established accessibility practices for older patients.
- [W3C accessible forms](https://www.w3.org/WAI/tutorials/forms/): clear labels, concise forms and useful feedback.
- [NHS buttons](https://service-manual.nhs.uk/design-system/components/buttons): clear action wording and a distinguishable primary action.
- [NHS App error patterns](https://design-system.nhsapp.service.nhs.uk/patterns/error-page/): distinguish fixable field errors from service failures and provide a route to recovery.

See [TEST_RESULTS.md](TEST_RESULTS.md) for actual executed results. Pending verification is never recorded as a pass.
