"""Rebuild initial SRS traceability from the locally extracted private reference."""
from pathlib import Path
import re

source = Path("docs/reference/srs.txt").read_text(encoding="utf-8")
body = source[source.index("PAGE 10\n"):source.index("PAGE 34\n")]
rows = {}
for match in re.finditer(r"(?m)^(FR-\d{3}|NFR-\d{3}|BR-\d{3})\s+", body):
    tail = body[match.end():]
    end = re.search(r"(?m)^(?:FR-|NFR-|BR-|PAGE |\d+\.\d+ |\d+\. )", tail)
    text = tail[:end.start()] if end else tail[:500]
    text = re.split(r"\b(?:Must|Should|Could)\s*(?:\n|$)", text)[0]
    text = re.sub(r"\s+", " ", text).strip().replace("|", "/")
    rows[match[1]] = text

def milestone(key):
    number = int(key.split("-")[1])
    if key.startswith("BR-"):
        return "2–5"
    if key.startswith("NFR-"):
        return "1–5"
    return "1" if number <= 12 else "2" if number <= 49 else "3" if number <= 55 else "4" if number <= 69 else "3–4"

def testcase(key):
    n = int(key.split("-")[1])
    if key.startswith("NFR-"): return "security / resilience / performance / backup suite (planned)"
    if key.startswith("BR-"): return "database invariants suite (planned)"
    if n <= 12: return "accounts integration + patient journey"
    if n <= 25: return "provider verification/discovery (planned)"
    if n <= 28: return "availability / concurrency (planned)"
    if n <= 49: return "booking RPC integration + patient/admin journey"
    if n <= 55: return "records ownership/amendments (planned)"
    if n <= 63: return "report/sharing/failure (planned)"
    if n <= 69: return "payment idempotency/refund (planned)"
    if n <= 73: return "review/support (planned)"
    if n <= 77: return "notification retry/dedup (planned)"
    return "admin authorisation/audit (planned)"

lines = ["# Requirements-to-tests matrix", "", "Source: supplied SRS v1.1 draft, 40 pages, read locally. Status is acceptance status, not file existence. All written but unverified code remains **pending**. Each SRS FR, NFR and BR is listed individually.", "", "See [decisions](DECISIONS.md) for scope reconciliation and [test results](TEST_RESULTS.md) for executed evidence.", "", "| ID | Requirement | Status | Milestone | Verification |", "|---|---|---|---|---|"]
for key, description in rows.items():
    status = "deferred" if key in {"FR-031","FR-041","FR-048","FR-049","BR-009"} else "conditional" if key in {"FR-010","NFR-004"} else "pending"
    lines.append(f"| {key} | {description} | {status} | {milestone(key)} | {testcase(key)} |")
lines += ["", "## Acceptance criteria", "", "| ID | Status | Evidence required |", "|---|---|---|"]
for n in range(1, 15):
    lines.append(f"| AC-{n:02} | pending | SRS section 11 criterion; mapped feature suites above, no acceptance pass yet. |")
lines += ["", "## Additional user-brief requirements", "", "| ID | Requirement | Status | Verification |", "|---|---|---|---|"]
extras = [
("UB-01","Local-only setup, synthetic data, no deployment","pending","environment + repository review"),
("UB-02","Admin MFA and account deactivation","pending","Auth MFA and inactive-session tests"),
("UB-03","Credential content/size validation and configurable expiry","pending","private Storage and assignment integration"),
("UB-04","Configurable travel buffer and transactional assignment","pending","two simultaneous reservations"),
("UB-05","Patient-controlled expiring/revocable report sharing","pending","hashed-token/access-log integration"),
("UB-06","Local PDF generation and review","pending","PDF content and browser export"),
("UB-07","Local template summary and configurable remote adapter","pending","no-network adapter + failure test"),
("UB-08","Reminder scheduling, email sink, retry/dedup","pending","worker restart/failure integration"),
("UB-09","Backup/restore database and files separately","pending","isolated restoration + object hashes"),
("UB-10","Responsive visual review and performance measurements","pending","three viewport screenshots + measured load"),
("UB-11","Native apps/GPS/video/real gateway/packages/delegation","deferred","roadmap only"),
]
for row in extras: lines.append("| " + " | ".join(row) + " |")
Path("docs/REQUIREMENTS_MATRIX.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
print(f"Mapped {len(rows)} requirements; expected 114 (82 FR + 19 NFR + 13 BR).")
if len(rows) != 114: raise SystemExit("Requirement count mismatch")
