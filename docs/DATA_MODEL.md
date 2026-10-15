# Data model

SQL migrations are authoritative.

## Migration 001 — foundation (applied)
profiles, patient_profiles, provider_profiles, credentials, verification_history, services, settings, availability, bookings, booking_history, audit_log. Client writes revoked; explicit RPC mutations and RLS reads. Registration metadata never grants administrator authority.

## Migration 002 — care workflows (applied)
provider_contacts (private), provider_services, time_off, session_records, record_amendments, notifications and private.email_outbox. Provider biography/demo fields, credential review metadata, preferred provider, reschedule history and configurable administrator MFA.
RPCs implement verification/suspension, availability, eligibility and assignment, rescheduling, start/completion/amendment, service/account/settings administration.
Clinical records are visible to the patient and authoring professional; administrators do not gain clinical access automatically.

## Migration 003 — reports and operations (applied)
payments/payment_history, reviews/review_moderation, support_requests/support_replies, reports/report_shares/report_access.
Reports preserve a source snapshot including amendments. Sharing hashes are not selectable by ordinary clients. Worker-only RPCs claim and finish email jobs.
Payments are unique per booking; duplicate successful simulations return the same record. Reviews require a completed owned visit and are unique per booking.

## Migration 004 — integrity polish (not yet applied)
Query indexes, bounded settings, inactive-patient assignment prevention, sharing review metadata, removal of unregistered credential uploads and monotonic successful email delivery.

Timestamps are timestamptz, displayed in the configured timezone. Money uses integer minor units; existing booking prices and durations survive service edits. Confirmed/In Progress visits reserve [starts_at,busy_until) through a GiST exclusion constraint. Availability and time-off checks are performed transactionally, not only in the UI.

