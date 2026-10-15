# Requirements-to-tests matrix

Source: supplied SRS v1.1 draft, 40 pages, read locally. Status is acceptance status, not file existence. All written but unverified code remains **pending**. Each SRS FR, NFR and BR is listed individually.

See [decisions](DECISIONS.md) for scope reconciliation and [test results](TEST_RESULTS.md) for executed evidence.

| ID | Requirement | Status | Milestone | Verification |
|---|---|---|---|---|
| FR-001 | The system shall allow patients to register by providing the required registration fields (name, email address and/or phone number, and password). | DB-tested; UI acceptance pending | 1 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-002 | The system shall allow nurses and physiotherapists to register as providers. | DB-tested; UI acceptance pending | 1 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-003 | The system shall validate required fields and the format of email addresses and phone numbers. | implemented; verification pending | 1 | Source implemented; acceptance pass not established. |
| FR-004 | The system shall authenticate users before granting access to protected functions. | implemented; verification pending | 1 | Source implemented; acceptance pass not established. |
| FR-005 | The system should provide a secure password-recovery mechanism. | implemented; verification pending | 1 | Source implemented; acceptance pass not established. |
| FR-006 | The system shall allow users to log out and shall invalidate the applicable session or token on logout. | implemented; verification pending | 1 | Source implemented; acceptance pass not established. |
| FR-007 | The system shall enforce role-based access control for patient, provider, and administrator functions. | DB-tested; UI acceptance pending | 1 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-008 | The system shall allow patients to view and update permitted profile fields. | DB-tested; UI acceptance pending | 1 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-009 | The system shall store the service address or service area needed for home visits. | DB-tested; UI acceptance pending | 1 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-010 | The system should support an optional emergency-contact field, subject to supervisor approval. | conditional | 1 | accounts integration + patient journey |
| FR-011 | The system shall collect only the health and recovery information needed for defined functions. | implemented; verification pending | 1 | Source implemented; acceptance pass not established. |
| FR-012 | The system shall allow patients to view their own bookings and authorised records and reports. | DB-tested; UI acceptance pending | 1 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-013 | Providers shall submit their profession, qualifications, experience, specialisation, service area, and contact details. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-014 | Providers shall submit credential evidence (for example, a registration or licence certificate) in the form supported by the system. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-015 | New provider applications shall default to the Pending status. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-016 | Authorised administrators shall be able to approve, reject, or suspend providers. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-017 | The system shall record the verification status, decision timestamp, and reviewing administrator for each decision. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-018 | Providers whose status is Pending, Rejected, or Suspended shall not receive confirmed bookings. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-019 | The system should allow a reason to be recorded for a rejection or suspension. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-020 | The visible provider profile shall display the provider's verification status. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-021 | The system shall display each provider's profession, qualifications, experience, specialisation, service area, and verification status. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-022 | Patients shall be able to search for providers by profession and service type. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-023 | The system should support filters for specialisation, area, availability, rating, and price where the data exists. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-024 | Private credential files and sensitive provider data shall not be exposed publicly. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-025 | The system should display a clear message when no matching providers are found. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-026 | Verified providers shall be able to create, update, and remove their availability as date and time ranges. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-027 | The system shall reject availability entries whose end time is not later than their start time. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-028 | The system should prevent a provider from removing or changing availability that overlaps a confirmed booking unless that booking is first cancelled or reassigned. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-029 | Authorised administrators shall be able to create, update, activate, and deactivate service listings. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-030 | Each service shall include a name, description, category, and price or pricing rule. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-031 | The system may support multi-session care packages with defined session counts and terms. | deferred | 2 | booking RPC integration + patient/admin journey |
| FR-032 | The system shall display relevant service details and known fees before a booking request is submitted. | implemented; verification pending | 2 | Source implemented; acceptance pass not established. |
| FR-033 | Authenticated patients shall be able to request an available service. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-034 | A booking shall record the patient, service, requested start time, expected duration or end time, location, status, and price snapshot. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-035 | The system shall validate that appointment times are in the future and comply with the scheduling rules defined in Section 7. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-036 | The system shall prevent overlapping confirmed appointments for the same provider. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-037 | Authorised users shall be able to view the status of a booking. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-038 | Booking statuses shall comprise Requested, Pending Assignment, Confirmed, In Progress, Completed, Cancelled, and Reassignment Required, as defined in Section 10.1. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-039 | The system shall support cancellation according to a defined cancellation policy. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-040 | The system should support rescheduling, subject to availability and policy. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-041 | The system may support non-consecutive sessions for care packages. | deferred | 2 | booking RPC integration + patient/admin journey |
| FR-042 | The system shall retain sufficient booking history to audit status changes. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-043 | An authorised administrator, or a defined assignment process approved by the project team, shall assign a verified provider to a booking. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-044 | Assignment shall consider profession, service eligibility, availability, and service area. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-045 | The system shall block assignments to unverified providers and assignments that conflict with the provider's schedule. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-046 | Authorised users shall be able to reassign a booking if the assigned provider becomes unavailable. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-047 | The system shall record assignment history, including timestamp, actor, and reason where provided. | DB-tested; UI acceptance pending | 2 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-048 | The system may recommend candidate providers using a documented scoring or AI approach. | deferred | 2 | booking RPC integration + patient/admin journey |
| FR-049 | Where automated recommendations are implemented, they shall be reviewable and overridable by an authorised human. | deferred | 2 | booking RPC integration + patient/admin journey |
| FR-050 | Authorised providers shall be able to record the session date, service, observations, and notes. | DB-tested; UI acceptance pending | 3 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-051 | Each session record shall be linked to the relevant patient and booking. | DB-tested; UI acceptance pending | 3 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-052 | Access to records shall be restricted according to role and patient relationship or authorisation. | DB-tested; UI acceptance pending | 3 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-053 | The system shall preserve the author and timestamp of each record. | DB-tested; UI acceptance pending | 3 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-054 | The system should support traceable amendments to records. | DB-tested; UI acceptance pending | 3 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-055 | The system should distinguish patient-reported information from provider observations. | DB-tested; UI acceptance pending | 3 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-056 | The system should generate a structured recovery summary from authorised session records. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-057 | AI-generated summaries shall be clearly labelled as machine-generated and potentially fallible. | implemented; verification pending | 4 | Source implemented; acceptance pass not established. |
| FR-058 | AI output shall not be presented as a diagnosis, prescription, or guaranteed prediction. | implemented; verification pending | 4 | Source implemented; acceptance pass not established. |
| FR-059 | Authorised users shall be able to review a report before downloading or sharing it. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-060 | The system should generate a PDF from approved data fields if report export is in scope. | implemented; verification pending | 4 | Source implemented; acceptance pass not established. |
| FR-061 | Report access and sharing shall be restricted to authorised users and patient-approved recipients. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-062 | The system should identify the reporting period and the source records used. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-063 | If AI or report generation fails, the system shall display an error and preserve the source records. | implemented; verification pending | 4 | Source implemented; acceptance pass not established. |
| FR-064 | The system shall associate payment records with the relevant booking or package. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-065 | The system shall track payment status separately from booking status. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-066 | Payment records shall include the amount, currency, method, reference, status, and timestamp, where available. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-067 | The system shall not store raw card security codes or full card credentials. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-068 | A payment gateway may be integrated; a sandbox or simulated flow may be used for the FYP prototype. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-069 | The system shall handle duplicate payment submissions and callbacks so that duplicate successful payment records are avoided, where feasible. | DB-tested; UI acceptance pending | 4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-070 | Patients should be able to rate a provider after a booking is completed. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-071 | Reviews should be linked to the patient, provider, booking, rating, and timestamp. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-072 | Authorised administrators should be able to investigate or hide reported reviews under platform policy. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-073 | The system may support user complaints or support requests. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-074 | The system shall display in-app booking status updates to the relevant users. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-075 | The system should notify relevant users of booking confirmation, cancellation, and reassignment. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| FR-076 | Email, SMS, or push notifications may be enabled when the corresponding integrations are configured. | implemented; verification pending | 3–4 | Source implemented; acceptance pass not established. |
| FR-077 | A notification failure shall not reverse or corrupt the underlying booking state. | implemented; verification pending | 3–4 | Source implemented; acceptance pass not established. |
| FR-078 | Administrators shall be able to view, search, activate, and deactivate user accounts, according to their permissions. | implemented; verification pending | 3–4 | Source implemented; acceptance pass not established. |
| FR-079 | Administrators shall be able to view and manage all bookings, including cancellation and reassignment (see Sections 3.7 and 3.8). | implemented; verification pending | 3–4 | Source implemented; acceptance pass not established. |
| FR-080 | The system should provide summaries of users, verified providers, bookings, cancellations, and completed services to administrators and, where defined, to the platform owner. | implemented; verification pending | 3–4 | Source implemented; acceptance pass not established. |
| FR-081 | The system shall log security-sensitive administrative actions. | implemented; verification pending | 3–4 | Source implemented; acceptance pass not established. |
| FR-082 | Administrative functions shall be restricted to authorised accounts. | DB-tested; UI acceptance pending | 3–4 | Foundation/care suites or synthetic seed; see TEST_RESULTS.md for exact scope. |
| NFR-001 | Security The system shall enforce authentication and role- based authorisation for all protected resources. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-002 | Password storage The system shall store passwords only as salted hashes produced by a modern password-hashing algorithm and shall never store plaintext passwords. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-003 | Session security The system should expire inactive sessions after a defined period and restrict repeated failed login attempts (thresholds to be defined during design). | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-004 | Transport security The system shall use HTTPS/TLS for all client-server communication in deployed environments. | conditional | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-005 | Privacy The system shall limit the collection, display, and sharing of personal and health data to defined purposes and authorised roles. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-006 | Auditability The system shall log credential decisions, administrative changes, and significant booking transitions, recording the actor and timestamp. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-007 | Performance Under a documented test load, 95% of ordinary non- AI requests should complete within 3 seconds, excluding network and external-service latency. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-008 | AI resilience Where AI features are implemented, the system shall display progress or a clear timeout or error state and shall keep stored records accessible if the AI service fails. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-009 | Usability The system should provide clear labels, validation messages, and status feedback for core tasks. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-010 | Accessibility The system should use readable colour contrast, keyboard-operable controls, and labelled form fields. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-011 | Compatibility The system should support the current versions of the mainstream browsers selected in the test plan. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-012 | Reliability The system shall persist booking and payment changes consistently and, where feasible, guard against duplicate submissions. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-013 | Scheduling integrity The system shall enforce appointment-conflict checks on the server and shall not rely solely on the user interface. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-014 | Maintainability The system should separate presentation, business logic, data access, and external integrations. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-015 | Scalability The system should allow growth in users and providers without a complete redesign. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-016 | Backup and recovery The system should be backed up at a frequency suitable for the prototype, and recovery from backup should be tested. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-017 | AI transparency Where AI features are implemented, the system shall label AI content and make it reviewable and, where practicable, traceable to its source records. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-018 | Interoperability The system should use documented APIs and handle unavailable external services gracefully. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| NFR-019 | Localisation The system may support configurable date/time formats and currency; language support is to be confirmed. | pending | 1–5 | security / resilience / performance / backup suite (planned) |
| BR-001 | Only providers with Verified status may be assigned to confirmed bookings. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-002 | A provider must be eligible for the selected service and service area. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-003 | A provider shall not have overlapping confirmed appointments. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-004 | A booking must have a valid patient, service, time, and location before it is confirmed. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-005 | Booking status and payment status shall be maintained separately. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-006 | Only completed bookings are eligible for patient reviews. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-007 | Recovery records are visible only to authorised users with a valid access relationship or patient authorisation. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-008 | AI-generated text is assistive only and shall not constitute a diagnosis or prescription. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-009 | AI assignment recommendations must be overridable by an authorised human. | deferred | 2–5 | database invariants suite (planned) |
| BR-010 | Provider credential files must not be publicly accessible. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-011 | The price shown at booking time shall be retained as a price snapshot. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-012 | Cancelled and reassigned bookings must retain an auditable status history. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |
| BR-013 | When a provider is suspended, that provider's future confirmed bookings shall be set to Reassignment Required. | DB-tested; final regression pending | 2–5 | Care workflow suite; migration 004 regression remains pending. |

## Acceptance criteria

| ID | Status | Evidence required |
|---|---|---|
| AC-01 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-02 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-03 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-04 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-05 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-06 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-07 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-08 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-09 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-10 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-11 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-12 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-13 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |
| AC-14 | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |

## Additional user-brief requirements

| ID | Requirement | Status | Verification |
|---|---|---|---|
| UB-01 | Local-only setup, synthetic data, no deployment | pending | environment + repository review |
| UB-02 | Admin MFA and account deactivation | pending | Auth MFA and inactive-session tests |
| UB-03 | Credential content/size validation and configurable expiry | pending | private Storage and assignment integration |
| UB-04 | Configurable travel buffer and transactional assignment | pending | two simultaneous reservations |
| UB-05 | Patient-controlled expiring/revocable report sharing | pending | hashed-token/access-log integration |
| UB-06 | Local PDF generation and review | pending | PDF content and browser export |
| UB-07 | Local template summary and configurable remote adapter | pending | no-network adapter + failure test |
| UB-08 | Reminder scheduling, email sink, retry/dedup | pending | worker restart/failure integration |
| UB-09 | Backup/restore database and files separately | pending | isolated restoration + object hashes |
| UB-10 | Responsive visual review and performance measurements | pending | three viewport screenshots + measured load |
| UB-11 | Native apps/GPS/video/real gateway/packages/delegation | deferred | roadmap only |


## Evidence update ? October 15

Database evidence is separate from complete UI acceptance. Migrations 001?003 ran; migration 004 is pending. The existing local runtime is stopped and its former Docker executable is missing. Twelve unit tests and four public browser tests pass. Homepage axe/overflow checks pass. Authenticated browser, recovery and performance acceptance remain open. Deferred and conditional scope remains unchanged.
