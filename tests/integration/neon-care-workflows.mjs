import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import {
  owner,
  deniedRecordEdit,
  clientFor,
  createAccount,
  seedServices,
  close,
} from "./neon-fixtures.mjs";
const anon = clientFor(null),
  tag = randomUUID().slice(0, 8),
  password = "Synthetic-" + randomUUID();
let count = 0;
function pass(name) {
  console.log("PASS " + name);
  count++;
}
function ok(r) {
  assert.ifError(r.error);
  return r.data;
}
function denied(r, name) {
  assert.ok(r.error, name);
  pass(name);
}
const account = (role, label) =>
  createAccount(
    label + "-" + tag + "@careathome.test",
    password,
    "Synthetic " + label,
    role,
  );
await seedServices();
try {
  const patient = await account("patient", "patient"),
    other = await account("patient", "other"),
    provider = await account("provider", "nurse"),
    unverified = await account("provider", "pending"),
    admin = await account("admin", "admin");
  const svc = "10000000-0000-4000-8000-000000000001",
    area = "Test area " + tag,
    start = Date.now() + 30 * 86400000;
  const fields = {
    p_name: "Test Nurse " + tag,
    p_qualifications: "Synthetic registration qualification",
    p_experience: 5,
    p_specialisation: "Test home support",
    p_areas: [area],
    p_bio: "Synthetic professional only",
    p_phone: "+920000000000",
    p_services: [svc],
  };
  ok(await provider.client.rpc("save_provider", fields));
  pass("provider profile and service eligibility saved");
  denied(
    await patient.client.rpc("save_provider", fields),
    "patient cannot submit provider profile",
  );
  denied(
    await admin.client.rpc("verify_provider", {
      p_provider: provider.id,
      p_status: "Verified",
      p_reason: "Test before credentials",
    }),
    "verification blocked without credential",
  );
  const path = provider.id + "/" + randomUUID() + ".pdf";
  ok(
    await provider.client.storage
      .from("credentials")
      .upload(path, Buffer.from("%PDF-1.4\nSynthetic credential only\n%%EOF"), {
        contentType: "application/pdf",
      }),
  );
  denied(
    await provider.client.rpc("register_credential", {
      p_path: path,
      p_expiry: "2020-01-01",
      p_label: "Expired test",
    }),
    "expired credential rejected",
  );
  ok(
    await provider.client.rpc("register_credential", {
      p_path: path,
      p_expiry: new Date(start + 365 * 86400000).toISOString().slice(0, 10),
      p_label: "Synthetic credential",
    }),
  );
  denied(
    await patient.client.rpc("verify_provider", {
      p_provider: provider.id,
      p_status: "Verified",
      p_reason: "Not an admin",
    }),
    "patient cannot verify providers",
  );
  ok(
    await admin.client.rpc("verify_provider", {
      p_provider: provider.id,
      p_status: "Verified",
      p_reason: "Synthetic review",
    }),
  );
  pass("administrator verification with current credential");
  assert.ok(
    ok(await anon.rpc("discover_providers", { p_area: area })).some(
      (p) => p.id === provider.id,
    ),
  );
  pass("verified public directory includes eligible provider");
  assert.equal(
    ok(
      await anon.rpc("discover_providers", {
        p_profession: "physiotherapist",
        p_area: area,
      }),
    ).length,
    0,
  );
  pass("discovery profession filter");
  denied(
    await anon.storage.from("credentials").download(path),
    "anonymous credential access denied",
  );
  denied(
    await other.client.storage.from("credentials").download(path),
    "unrelated patient credential access denied",
  );
  const range = {
    p_id: null,
    p_start: new Date(start - 86400000).toISOString(),
    p_end: new Date(start + 20 * 86400000).toISOString(),
    p_delete: false,
  };
  denied(
    await unverified.client.rpc("save_availability", range),
    "unverified availability blocked",
  );
  denied(
    await provider.client.rpc("save_availability", {
      ...range,
      p_end: range.p_start,
    }),
    "zero-length availability rejected",
  );
  ok(await provider.client.rpc("save_availability", range));
  const availability = ok(
    await provider.client
      .from("availability")
      .select("id")
      .eq("provider_id", provider.id)
      .single(),
  ).id;
  pass("verified provider availability saved");
  denied(
    await provider.client.rpc("save_availability", range),
    "overlapping availability rejected",
  );
  async function booking(at = start, service = svc, zone = area) {
    return ok(
      await patient.client.rpc("request_booking", {
        p_service: service,
        p_start: new Date(at).toISOString(),
        p_address: "Synthetic integration address",
        p_area: zone,
        p_request_key: randomUUID(),
      }),
    );
  }
  async function queued(at = start, service = svc, zone = area) {
    const id = await booking(at, service, zone);
    ok(await admin.client.rpc("queue_booking", { p_booking: id }));
    return id;
  }
  const b1 = await queued(),
    b2 = await queued();
  denied(
    await patient.client.rpc("assign_booking", {
      p_booking: b1,
      p_provider: provider.id,
      p_reason: "Unauthorised assignment",
    }),
    "patient assignment denied",
  );
  denied(
    await admin.client.rpc("assign_booking", {
      p_booking: b1,
      p_provider: unverified.id,
      p_reason: "Pending provider test",
    }),
    "pending provider assignment denied",
  );
  const race = await Promise.all(
    [b1, b2].map((id) =>
      admin.client.rpc("assign_booking", {
        p_booking: id,
        p_provider: provider.id,
        p_reason: "Concurrent assignment test",
      }),
    ),
  );
  assert.equal(race.filter((r) => !r.error).length, 1);
  pass("concurrent assignment permits exactly one conflicting visit");
  const assigned = race[0].error ? b2 : b1,
    waiting = assigned === b1 ? b2 : b1;
  denied(
    await provider.client.rpc("save_availability", {
      ...range,
      p_id: availability,
      p_delete: true,
    }),
    "availability cannot be removed over confirmed visit",
  );
  denied(
    await provider.client.rpc("manage_time_off", {
      ...range,
      p_id: null,
      p_reason: "Conflicting time off",
    }),
    "time off cannot overlap confirmed visit",
  );
  const buffer = await queued(start + 75 * 60000);
  denied(
    await admin.client.rpc("assign_booking", {
      p_booking: buffer,
      p_provider: provider.id,
      p_reason: "Travel conflict",
    }),
    "travel buffer protects adjacent visit",
  );
  const wrong = await queued(start + 2 * 86400000, svc, "Wrong area");
  denied(
    await admin.client.rpc("assign_booking", {
      p_booking: wrong,
      p_provider: provider.id,
      p_reason: "Wrong area test",
    }),
    "service area mismatch rejected",
  );
  const physio = await queued(
    start + 2 * 86400000,
    "10000000-0000-4000-8000-000000000002",
  );
  denied(
    await admin.client.rpc("assign_booking", {
      p_booking: physio,
      p_provider: provider.id,
      p_reason: "Wrong profession test",
    }),
    "profession mismatch rejected",
  );
  const offStart = start + 4 * 86400000;
  ok(
    await provider.client.rpc("manage_time_off", {
      p_id: null,
      p_start: new Date(offStart).toISOString(),
      p_end: new Date(offStart + 86400000).toISOString(),
      p_reason: "Synthetic leave",
      p_delete: false,
    }),
  );
  const off = ok(
    await provider.client
      .from("time_off")
      .select("id")
      .eq("provider_id", provider.id)
      .single(),
  ).id;
  const offBooking = await queued(offStart + 3600000);
  denied(
    await admin.client.rpc("assign_booking", {
      p_booking: offBooking,
      p_provider: provider.id,
      p_reason: "Time off test",
    }),
    "time off prevents assignment",
  );
  ok(
    await provider.client.rpc("manage_time_off", {
      p_id: off,
      p_start: new Date(offStart).toISOString(),
      p_end: new Date(offStart + 86400000).toISOString(),
      p_reason: "Synthetic leave",
      p_delete: true,
    }),
  );
  denied(
    await patient.client.rpc("submit_review", {
      p_booking: assigned,
      p_rating: 5,
      p_comment: "Too early",
    }),
    "review before completion denied",
  );
  const payment = ok(
    await patient.client.rpc("simulate_payment", {
      p_booking: assigned,
      p_outcome: "Paid",
    }),
  );
  assert.equal(
    ok(
      await patient.client.rpc("simulate_payment", {
        p_booking: assigned,
        p_outcome: "Paid",
      }),
    ),
    payment,
  );
  pass("payment retries return the same record");
  assert.equal(
    ok(
      await patient.client
        .from("bookings")
        .select("status")
        .eq("id", assigned)
        .single(),
    ).status,
    "Confirmed",
  );
  pass("payment state is independent of booking state");
  denied(
    await other.client.rpc("simulate_payment", {
      p_booking: assigned,
      p_outcome: "Paid",
    }),
    "cross-patient payment denied",
  );
  denied(
    await patient.client.rpc("refund_payment", { p_payment: payment }),
    "patient refund denied",
  );
  ok(await admin.client.rpc("refund_payment", { p_payment: payment }));
  assert.equal(
    ok(
      await patient.client
        .from("payments")
        .select("status")
        .eq("id", payment)
        .single(),
    ).status,
    "Refunded",
  );
  pass("administrator simulated refund persisted");
  ok(
    await patient.client.rpc("reschedule_booking", {
      p_booking: assigned,
      p_start: new Date(start + 3 * 3600000).toISOString(),
      p_reason: "Synthetic schedule change",
    }),
  );
  const moved = ok(
    await patient.client
      .from("bookings")
      .select("*")
      .eq("id", assigned)
      .single(),
  );
  assert.equal(moved.price_minor, 350000);
  assert.equal(moved.status, "Confirmed");
  pass("reschedule preserves price and valid confirmation");
  const history = ok(
    await patient.client
      .from("booking_history")
      .select("*")
      .eq("booking_id", assigned),
  );
  assert.ok(history.some((h) => h.old_start && h.new_start));
  pass("reschedule records old and new times");
  denied(
    await provider.client.rpc("start_visit", { p_booking: assigned }),
    "provider cannot start too early",
  );
  const past = new Date(Date.now() - 3600000);
  await owner.query(
    "update public.bookings set starts_at=$1,ends_at=$2,busy_until=$3 where id=$4",
    [
      past.toISOString(),
      new Date(past.getTime() + 3600000).toISOString(),
      new Date(past.getTime() + 5400000).toISOString(),
      assigned,
    ],
  );

  denied(
    await patient.client.rpc("cancel_booking", {
      p_booking: assigned,
      p_reason: "Within cutoff",
    }),
    "patient cancellation cutoff enforced",
  );
  denied(
    await unverified.client.rpc("start_visit", { p_booking: assigned }),
    "unassigned provider cannot start visit",
  );
  ok(await provider.client.rpc("start_visit", { p_booking: assigned }));
  pass("assigned provider starts visit");
  const record = ok(
    await provider.client.rpc("complete_visit", {
      p_booking: assigned,
      p_observations: "Synthetic observations retained",
      p_patient_report: "Synthetic patient report",
      p_notes: "Synthetic notes",
      p_mobility: 12,
    }),
  );
  pass("completion atomically creates authored session record");
  denied(
    await provider.client.rpc("complete_visit", {
      p_booking: assigned,
      p_observations: "Duplicate",
      p_patient_report: "",
      p_notes: "",
      p_mobility: null,
    }),
    "Completed is terminal",
  );
  assert.equal(
    ok(await other.client.from("session_records").select("*").eq("id", record))
      .length,
    0,
  );
  pass("unrelated patient cannot read clinical record");
  assert.equal(
    ok(await admin.client.from("session_records").select("*").eq("id", record))
      .length,
    0,
  );
  pass("administrator has no clinical record access");
  denied(
    await deniedRecordEdit(patient.id, record),
    "direct clinical record edit denied",
  );
  ok(
    await provider.client.rpc("amend_record", {
      p_record: record,
      p_content: "Synthetic clarified observation",
      p_reason: "Correction for test",
    }),
  );
  assert.equal(
    ok(
      await patient.client
        .from("session_records")
        .select("observations")
        .eq("id", record)
        .single(),
    ).observations,
    "Synthetic observations retained",
  );
  pass("amendment retains immutable original");
  denied(
    await unverified.client.rpc("amend_record", {
      p_record: record,
      p_content: "Intruder amendment",
      p_reason: "Wrong author",
    }),
    "non-author amendment denied",
  );
  ok(
    await patient.client.rpc("submit_review", {
      p_booking: assigned,
      p_rating: 4,
      p_comment: "Synthetic feedback",
    }),
  );
  denied(
    await patient.client.rpc("submit_review", {
      p_booking: assigned,
      p_rating: 5,
      p_comment: "Duplicate",
    }),
    "one review per completed visit",
  );
  const review = ok(
    await patient.client
      .from("reviews")
      .select("id")
      .eq("booking_id", assigned)
      .single(),
  );
  ok(
    await admin.client.rpc("moderate_review", {
      p_review: review.id,
      p_visible: false,
      p_reason: "Synthetic moderation test",
    }),
  );
  assert.equal(
    ok(await anon.rpc("discover_providers", { p_area: area }))[0].review_count,
    0,
  );
  pass("hidden reviews excluded from public rating");
  const reportSettings = ok(await patient.client.from("settings").select("timezone").single());
  const reportDate = new Intl.DateTimeFormat("en-CA", { timeZone: reportSettings.timezone });
  const today = reportDate.format(new Date());
  const from = reportDate.format(new Date(Date.now() - 2 * 86400000));
  const report = ok(
    await patient.client.rpc("create_report", {
      p_patient: patient.id,
      p_from: from,
      p_to: today,
    }),
  );
  const reportData = ok(
    await patient.client.from("reports").select("*").eq("id", report).single(),
  );
  assert.equal(reportData.source_records[0].amendments.length, 1);
  assert.match(reportData.summary, /TEMPLATE/);
  pass("report snapshots sources and amendments with template label");
  denied(
    await other.client.rpc("create_report", {
      p_patient: patient.id,
      p_from: from,
      p_to: today,
    }),
    "cross-patient report generation denied",
  );
  const token = randomBytes(32).toString("hex"),
    hash = createHash("sha256").update(token).digest("hex");
  const shareArgs = {
    p_report: report,
    p_hash: hash,
    p_expiry: new Date(Date.now() + 86400000).toISOString(),
  };
  denied(
    await patient.client.rpc("share_report", shareArgs),
    "sharing requires report review",
  );
  ok(await patient.client.rpc("review_report", { p_report: report }));
  const share = ok(await patient.client.rpc("share_report", shareArgs));
  assert.equal(
    ok(await anon.rpc("read_shared_report", { p_token: token })).id,
    report,
  );
  pass("valid bearer link reveals only selected report");
  denied(
    await patient.client.from("report_shares").select("token_hash"),
    "token hashes are not readable",
  );
  assert.equal(
    ok(await anon.rpc("read_shared_report", { p_token: hash })),
    null,
  );
  pass("stored hash is not itself a bearer credential");
  assert.equal(
    ok(
      await patient.client
        .from("report_access")
        .select("*")
        .eq("share_id", share),
    ).length,
    1,
  );
  pass("share access logged");
  ok(await patient.client.rpc("revoke_share", { p_share: share }));
  assert.equal(
    ok(await anon.rpc("read_shared_report", { p_token: token })),
    null,
  );
  pass("revocation immediately denies link");
  const token2 = randomBytes(32).toString("hex");
  const share2 = ok(
    await patient.client.rpc("share_report", {
      ...shareArgs,
      p_hash: createHash("sha256").update(token2).digest("hex"),
    }),
  );
  await owner.query(
    "update public.report_shares set expires_at=now()-interval '1 second' where id=$1",
    [share2],
  );

  assert.equal(
    ok(await anon.rpc("read_shared_report", { p_token: token2 })),
    null,
  );
  pass("expired share rejected");
  const support = ok(
    await patient.client.rpc("create_support", {
      p_booking: assigned,
      p_subject: "Synthetic support",
      p_message: "A synthetic question about this visit",
    }),
  );
  denied(
    await other.client.rpc("reply_support", {
      p_request: support,
      p_body: "Intruder",
      p_status: "Resolved",
    }),
    "unrelated support reply denied",
  );
  ok(
    await admin.client.rpc("reply_support", {
      p_request: support,
      p_body: "Synthetic administrator response",
      p_status: "Resolved",
    }),
  );
  assert.equal(
    ok(
      await patient.client
        .from("support_requests")
        .select("status")
        .eq("id", support)
        .single(),
    ).status,
    "Resolved",
  );
  pass("support response and resolution persisted");
  ok(
    await admin.client.rpc("assign_booking", {
      p_booking: waiting,
      p_provider: provider.id,
      p_reason: "Reusing released window",
    }),
  );
  ok(
    await admin.client.rpc("verify_provider", {
      p_provider: provider.id,
      p_status: "Suspended",
      p_reason: "Synthetic suspension",
    }),
  );
  assert.equal(
    ok(
      await patient.client
        .from("bookings")
        .select("status")
        .eq("id", waiting)
        .single(),
    ).status,
    "Reassignment Required",
  );
  pass("suspension moves future confirmed visits to reassignment");
  assert.equal(
    ok(await anon.rpc("discover_providers", { p_area: area })).length,
    0,
  );
  pass("suspended provider excluded from discovery");
  assert.ok(
    ok(await patient.client.from("notifications").select("*")).length > 0,
  );
  pass("booking events create in-app notifications");
  denied(
    await patient.client.rpc("claim_emails"),
    "ordinary account cannot claim email outbox",
  );
  console.log(
    "Care workflow integration: " +
      count +
      " passed. Synthetic fixtures retained for audit.",
  );
} finally {
  await close();
}
