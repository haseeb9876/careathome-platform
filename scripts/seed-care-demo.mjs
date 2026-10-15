import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname))
  throw new Error("Local synthetic data only");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = readFileSync(".env.demo", "utf8").trim().split("=")[1];
const root = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const svc = "10000000-0000-4000-8000-000000000001";
async function ok(result) {
  if (result.error) throw result.error;
  return result.data;
}
async function login(role) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const data = await ok(
    await client.auth.signInWithPassword({
      email: role + "@careathome.test",
      password,
    }),
  );
  return { client, id: data.user.id };
}
const patient = await login("patient"),
  provider = await login("provider"),
  admin = await login("admin");
const existing = await ok(
  await patient.client.from("bookings").select("id").limit(1),
);
if (existing.length) {
  console.log(
    "Demo care data already present; leaving existing visits unchanged.",
  );
  process.exit(0);
}
await ok(
  await patient.client.rpc("update_patient_profile", {
    p_name: "Ayesha · Demo Patient",
    p_address: "12 Garden Lane, synthetic demonstration address",
    p_area: "Peshawar",
  }),
);
await ok(
  await provider.client.rpc("save_provider", {
    p_name: "Sara Ahmed · Demo Nurse",
    p_qualifications: "Synthetic nursing qualification for demonstration only",
    p_experience: 6,
    p_specialisation: "Home nursing and wellbeing support",
    p_areas: ["Peshawar", "University Town, Peshawar"],
    p_bio:
      "Thoughtful nursing support in familiar surroundings. This is a fictional professional profile for local testing.",
    p_phone: "+920000000000",
    p_services: [svc],
  }),
);
await ok(
  await root
    .from("provider_profiles")
    .update({ demo: true })
    .eq("id", provider.id),
);
const path = provider.id + "/" + randomUUID() + ".pdf";
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);
await ok(
  await provider.client.storage
    .from("credentials")
    .upload(path, pdf, { contentType: "application/pdf" }),
);
await ok(
  await provider.client.rpc("register_credential", {
    p_path: path,
    p_expiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    p_label: "Synthetic registration · Demo only",
  }),
);
await ok(
  await admin.client.rpc("verify_provider", {
    p_provider: provider.id,
    p_status: "Verified",
    p_reason: "Synthetic credential reviewed for local demonstration only",
  }),
);
const now = Date.now();
await ok(
  await provider.client.rpc("save_availability", {
    p_id: null,
    p_start: new Date(now - 10 * 86400000).toISOString(),
    p_end: new Date(now + 90 * 86400000).toISOString(),
    p_delete: false,
  }),
);
for (let i = 0; i < 5; i++) {
  const start = new Date(now + (i + 3) * 86400000);
  start.setUTCHours(5 + i, 0, 0, 0);
  const id = await ok(
    await patient.client.rpc("request_booking", {
      p_service: svc,
      p_start: start.toISOString(),
      p_address: "12 Garden Lane, synthetic demonstration address",
      p_area: "Peshawar",
      p_request_key: randomUUID(),
    }),
  );
  if (i === 4) continue;
  await ok(await admin.client.rpc("queue_booking", { p_booking: id }));
  await ok(
    await admin.client.rpc("assign_booking", {
      p_booking: id,
      p_provider: provider.id,
      p_reason: "Synthetic care visit coordination",
    }),
  );
  if (i < 3) {
    const past = new Date(now - (7 - i * 2) * 86400000);
    const end = new Date(past.getTime() + 3600000);
    await ok(
      await root
        .from("bookings")
        .update({
          starts_at: past.toISOString(),
          ends_at: end.toISOString(),
          busy_until: new Date(end.getTime() + 1800000).toISOString(),
        })
        .eq("id", id),
    );
    await ok(await provider.client.rpc("start_visit", { p_booking: id }));
    await ok(
      await provider.client.rpc("complete_visit", {
        p_booking: id,
        p_observations: [
          "Discussed everyday comfort and observed participation in the planned session. Synthetic demonstration record.",
          "Completed the planned home support session. Patient participated in a short supervised activity. Synthetic record.",
          "Reviewed the patient’s experience of the previous visit and documented today’s session. Synthetic record.",
        ][i],
        p_patient_report: [
          "Patient reports feeling more comfortable discussing care needs.",
          "Patient reports enjoying time spent moving around the living room.",
          "Patient reports feeling supported and would like to continue visits.",
        ][i],
        p_notes:
          "Demonstration notes only. No clinical advice or diagnosis is implied.",
        p_mobility: [10, 15, 20][i],
      }),
    );
    await ok(
      await patient.client.rpc("simulate_payment", {
        p_booking: id,
        p_outcome: "Paid",
      }),
    );
    if (i === 2)
      await ok(
        await patient.client.rpc("submit_review", {
          p_booking: id,
          p_rating: 5,
          p_comment:
            "Synthetic demonstration feedback: thoughtful and punctual support.",
        }),
      );
  }
}
await ok(
  await patient.client.rpc("create_support", {
    p_booking: null,
    p_subject: "Getting ready for my next visit",
    p_message:
      "Synthetic question: where can I find the details for my confirmed visit?",
  }),
);
console.log(
  "Seeded 5 synthetic visits, 3 completed records, 3 simulated payments, a verified demo professional and a support request.",
);
