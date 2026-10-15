// Real local Auth + REST/RPC tests. Creates only synthetic test-owned accounts.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Tests require local Supabase.");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const password = "SyntheticOnly-" + randomUUID();
const tag = randomUUID().slice(0, 8);
let passed = 0;
const check = (label) => {
  passed++;
  console.log("PASS " + label);
};
async function account(role, metadata = {}) {
  const email = role + "-" + tag + "@careathome.test";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Synthetic " + role, role, ...metadata },
  });
  assert.ifError(error);
  const client = createClient(url, key, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  assert.ifError(login.error);
  return { id: data.user.id, client };
}
const a = await account("patient");
const b = await account("other", { role: "patient" });
const p = await account("provider", { profession: "nurse" });
const tamper = await account("admin");
let r = await tamper.client
  .from("profiles")
  .select("role")
  .eq("id", tamper.id)
  .single();
assert.equal(r.data.role, "patient");
check("admin metadata cannot provision admin");
r = await p.client
  .from("provider_profiles")
  .select("verification")
  .eq("id", p.id)
  .single();
assert.equal(r.data.verification, "Pending");
check("provider defaults Pending");
r = await a.client.from("profiles").update({ role: "admin" }).eq("id", a.id);
assert.ok(r.error);
check("direct role mutation denied");
r = await b.client.from("patient_profiles").select("*").eq("id", a.id);
assert.ifError(r.error);
assert.equal(r.data.length, 0);
check("cross-patient profile read denied");
const request = {
  p_service: "10000000-0000-4000-8000-000000000001",
  p_start: new Date(Date.now() + 72 * 3600000).toISOString(),
  p_address: "Synthetic address only",
  p_area: "Peshawar",
  p_request_key: randomUUID(),
};
r = await a.client.rpc("request_booking", request);
assert.ifError(r.error);
const booking = r.data;
assert.ok(booking);
check("patient request persisted");
const repeat = await a.client.rpc("request_booking", request);
assert.ifError(repeat.error);
assert.equal(repeat.data, booking);
check("repeated submission is idempotent");
r = await a.client.from("bookings").select("*").eq("id", booking).single();
assert.ifError(r.error);
assert.equal(r.data.patient_id, a.id);
assert.equal(r.data.price_minor, 350000);
assert.equal(r.data.status, "Requested");
check("server derives owner, price and Requested state");
r = await b.client.from("bookings").select("*").eq("id", booking);
assert.ifError(r.error);
assert.equal(r.data.length, 0);
check("cross-patient booking read denied");
r = await b.client.rpc("cancel_booking", {
  p_booking: booking,
  p_reason: "Synthetic attack",
});
assert.ok(r.error);
check("cross-patient cancellation denied");
r = await p.client.rpc("request_booking", {
  ...request,
  p_request_key: randomUUID(),
});
assert.ok(r.error);
check("provider cannot request as patient");
r = await a.client.rpc("queue_booking", { p_booking: booking });
assert.ok(r.error);
check("patient cannot perform admin queue transition");
r = await a.client.rpc("request_booking", {
  ...request,
  p_start: "2020-01-01T10:00:00Z",
  p_request_key: randomUUID(),
});
assert.ok(r.error);
check("database rejects past appointments");
r = await a.client.rpc("cancel_booking", {
  p_booking: booking,
  p_reason: "Synthetic cancellation",
});
assert.ifError(r.error);
r = await a.client.rpc("cancel_booking", {
  p_booking: booking,
  p_reason: "Repeat cancellation",
});
assert.ok(r.error);
check("Cancelled is terminal");
r = await a.client
  .from("booking_history")
  .select("*")
  .eq("booking_id", booking);
assert.ifError(r.error);
assert.equal(r.data.length, 2);
check("request and cancellation retain history");
const filePath = p.id + "/" + randomUUID() + ".pdf";
r = await p.client.storage
  .from("credentials")
  .upload(
    filePath,
    new Blob(["%PDF-1.4\nSynthetic credential test"], {
      type: "application/pdf",
    }),
  );
assert.ifError(r.error);
r = await a.client.storage.from("credentials").download(filePath);
assert.ok(r.error);
check("patient cannot download provider credentials");
const anon = createClient(url, key, { auth: { persistSession: false } });
r = await anon.storage.from("credentials").download(filePath);
assert.ok(r.error);
check("anonymous credential download denied");
r = await admin.from("profiles").update({ active: false }).eq("id", a.id);
assert.ifError(r.error);
r = await a.client.from("bookings").select("*");
assert.ifError(r.error);
assert.equal(r.data.length, 0);
r = await a.client.rpc("request_booking", {
  ...request,
  p_request_key: randomUUID(),
});
assert.ok(r.error);
check("inactive account token cannot access bookings or create requests");
console.log(
  passed +
    " local integration checks passed. Synthetic fixtures retained for persistence inspection; reset only with explicit intent.",
);
