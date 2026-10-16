# Current scope ? October 16, 2026

Public Vercel deployment is now explicitly authorised. This supersedes earlier local-review deployment gates below. Use the free Vercel project connected to private GitHub source and the existing free Neon project. No Docker. Public content must remain clearly labelled as synthetic demonstration data; payments are simulated. External email is not configured, and clinical deployment remains outside this demonstration scope.

# Decisions and SRS reconciliation

## Latest scope decision — October 15: Neon and GitHub

The user explicitly selected Neon instead of Supabase and authorised storing source under GitHub account `haseeb9876`. Docker was removed intentionally. These instructions supersede the historical local-Supabase-only/no-push decisions below. Use free development resources and synthetic data. Vercel is the intended deployment platform; timing is awaiting clarification because the previous instruction required local review first. See [migration decisions and acceptance gates](NEON_MIGRATION.md).

| Issue | Development decision |
|---|---|
| OI-01, OI-02 | Responsive Next.js/TypeScript web app with local Supabase/PostgreSQL. Native apps deferred. |
| OI-03 | Patient, provider (nurse/physiotherapist), administrator. No separate doctor/platform-owner login. |
| OI-04 | Administrator assigns; provider acceptance not required initially. No autonomous assignment. |
| OI-05 / FR-031, FR-041 | Multi-session care packages deferred by user brief. |
| OI-06 / FR-068 | Local simulated payments; real gateway deferred. |
| OI-07 / FR-056–063 | Local report/template-summary workflow is in scope; remote AI conditional on explicit data-handling approval. |
| OI-08 | Local development only. Human credential review; deployment jurisdiction and verification authority unresolved. |
| OI-09 | Provisional 24h patient cancellation cutoff; admin override with reason. Rescheduling must revalidate eligibility/conflicts. Missed/late visit is an audit event, not a new SRS status. |
| OI-10 | English, Asia/Karachi, PKR initially. Settings stored in DB. Current booking form explicitly uses UTC+05:00; dynamic timezone form support pending. |
| OI-11 | University template/format requirements remain external. |
| OI-12 | No deadline supplied. Work in ordered, verifiable milestones. |

30-minute scheduling buffer is not route estimation. Credential expiry enforcement defaults on; expiry/renewal UI and assignment enforcement remain pending. Reinstatement/reapplication policies require documented transitions when implemented. Payment simulation will use one successful record per booking and explicit refunds; no automatic refund policy is yet implemented.

SRS section 15 calls reports/payments/reviews a later phase; the user brief explicitly includes these in this release. FR-048/049 and BR-009 remain deferred with automated recommendations. FR-010 emergency contact remains conditional, so no unnecessary contact field is collected.

Security defaults: registration never grants admin from metadata. Local admin provisioning is an explicit command. Patient records are not automatically visible to administrators. Future clinical access requires a defined relationship. Sharing uses bearer links only after explicit patient selection, with expiry/revocation; recipient verification remains a deployment decision.

Environment: Windows 10 Pro; Node 22.23.2; npm 10.9.8; Git 2.55.0; Docker 29.8.2, WSL2. Initially 16 GiB RAM (~9 GiB free), ~45 GiB disk free. Docker was stopped and successfully started. PowerShell npm.ps1 is blocked by execution policy: use npm.cmd. Windows Codex sandbox fails with SetNamedSecurityInfoW error 5; approved commands currently run outside it.

SRS cover/control date mismatch is recorded, not corrected in the original. Existing Careathome-Platform casing is retained to preserve the supplied folder on case-insensitive Windows.

## October 15 implementation update
The initial infrastructure failure was resolved on October 14; migrations 001–003 and actual integration tests ran. On October 15 the runtime is stopped and Docker is missing from its former location. This is a new environment blocker, not the earlier registry failure.

Timezone conversion is now driven by database settings (Karachi, UTC, Dubai). Administrator settings, MFA UI, credential expiry eligibility, human verification transitions, simulated refunds and private sharing are implemented. They still require final authenticated browser acceptance. Verified-profile edits return the application to Pending and release future confirmed visits; Rejected profiles may edit and resubmit. Suspended profiles require administrator review.

The report summary remains deterministic and labelled. CARE_SUMMARY_ADAPTER only supports local-template-v1; unsupported values fail clearly without altering original records or sending them externally. Clinical administrators have no automatic access to session records.
