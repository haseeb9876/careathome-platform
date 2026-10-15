"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { requireAccount } from "@/modules/accounts/session";
import { getSummaryAdapter } from "@/modules/reports/adapter";
const uuid = z.uuid(),
  nullableUuid = z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    uuid.nullable(),
  );
const text = (min = 0, max = 500) => z.string().trim().min(min).max(max);
const flag = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean(),
);
const number = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);
const date = z.iso.date();
const timestamp = z.string().datetime({ offset: true });
const definitions: Record<
  string,
  { schema: z.ZodType; rpc: string; tab: string }
> = {
  provider: {
    schema: z.object({
      p_name: text(2, 100),
      p_qualifications: text(3, 2000),
      p_experience: number(0, 70),
      p_specialisation: text(0, 200),
      p_areas: z.array(text(2, 100)).min(1).max(20),
      p_bio: text(0, 2000),
      p_phone: z.string().regex(/^\+?[0-9 ()-]{7,25}$/),
      p_services: z.array(uuid).min(1),
    }),
    rpc: "save_provider",
    tab: "profile",
  },
  verify: {
    schema: z.object({
      p_provider: uuid,
      p_status: z.enum(["Verified", "Rejected", "Suspended"]),
      p_reason: text(3),
    }),
    rpc: "verify_provider",
    tab: "providers",
  },
  availability: {
    schema: z.object({
      p_id: nullableUuid,
      p_start: timestamp,
      p_end: timestamp,
      p_delete: flag,
    }),
    rpc: "save_availability",
    tab: "schedule",
  },
  timeoff: {
    schema: z.object({
      p_id: nullableUuid,
      p_start: timestamp,
      p_end: timestamp,
      p_reason: text(),
      p_delete: flag,
    }),
    rpc: "manage_time_off",
    tab: "schedule",
  },
  assign: {
    schema: z.object({ p_booking: uuid, p_provider: uuid, p_reason: text(3) }),
    rpc: "assign_booking",
    tab: "bookings",
  },
  reassign: {
    schema: z.object({ p_booking: uuid, p_reason: text(3) }),
    rpc: "require_reassignment",
    tab: "bookings",
  },
  reschedule: {
    schema: z.object({
      p_booking: uuid,
      p_start: timestamp,
      p_reason: text(3),
    }),
    rpc: "reschedule_booking",
    tab: "bookings",
  },
  start: {
    schema: z.object({ p_booking: uuid }),
    rpc: "start_visit",
    tab: "bookings",
  },
  complete: {
    schema: z.object({
      p_booking: uuid,
      p_observations: text(3, 10000),
      p_patient_report: text(0, 10000),
      p_notes: text(0, 10000),
      p_mobility: z.preprocess(
        (v) => (v === "" ? null : v),
        number(0, 1440).nullable(),
      ),
    }),
    rpc: "complete_visit",
    tab: "records",
  },
  amend: {
    schema: z.object({
      p_record: uuid,
      p_content: text(3, 10000),
      p_reason: text(3),
    }),
    rpc: "amend_record",
    tab: "records",
  },
  service: {
    schema: z.object({
      p_id: nullableUuid,
      p_name: text(3, 100),
      p_category: z.enum(["nurse", "physiotherapist"]),
      p_description: text(10, 2000),
      p_duration: number(15, 480),
      p_price: number(0, 100000000),
      p_currency: z.string().regex(/^[A-Z]{3}$/),
      p_active: flag,
    }),
    rpc: "save_service",
    tab: "services",
  },
  account: {
    schema: z.object({ p_user: uuid, p_active: flag }),
    rpc: "set_account_active",
    tab: "users",
  },
  settings: {
    schema: z.object({
      p_timezone: z.enum(["Asia/Karachi", "UTC", "Asia/Dubai"]),
      p_currency: z.string().regex(/^[A-Z]{3}$/),
      p_buffer: number(0, 180),
      p_cutoff: number(0, 168),
      p_expiry: flag,
      p_mfa: flag,
    }),
    rpc: "save_settings",
    tab: "settings",
  },
  pay: {
    schema: z.object({
      p_booking: uuid,
      p_outcome: z.enum(["Paid", "Failed"]),
    }),
    rpc: "simulate_payment",
    tab: "payments",
  },
  refund: {
    schema: z.object({ p_payment: uuid }),
    rpc: "refund_payment",
    tab: "payments",
  },
  review: {
    schema: z.object({
      p_booking: uuid,
      p_rating: number(1, 5),
      p_comment: text(0, 2000),
    }),
    rpc: "submit_review",
    tab: "reviews",
  },
  moderate: {
    schema: z.object({ p_review: uuid, p_visible: flag, p_reason: text(3) }),
    rpc: "moderate_review",
    tab: "reviews",
  },
  support: {
    schema: z.object({
      p_booking: nullableUuid,
      p_subject: text(3, 150),
      p_message: text(5, 5000),
    }),
    rpc: "create_support",
    tab: "support",
  },
  reply: {
    schema: z.object({
      p_request: uuid,
      p_body: text(3, 5000),
      p_status: z.enum(["Open", "In review", "Resolved"]),
    }),
    rpc: "reply_support",
    tab: "support",
  },
  report: {
    schema: z.object({ p_patient: uuid, p_from: date, p_to: date }),
    rpc: "create_report",
    tab: "reports",
  },
  report_review: {
    schema: z.object({ p_report: uuid }),
    rpc: "review_report",
    tab: "reports",
  },
  revoke: {
    schema: z.object({ p_share: uuid }),
    rpc: "revoke_share",
    tab: "reports",
  },
  read: {
    schema: z.object({ p_id: uuid }),
    rpc: "mark_notification_read",
    tab: "notifications",
  },
  queue: {
    schema: z.object({ p_booking: uuid }),
    rpc: "queue_booking",
    tab: "bookings",
  },
  cancel: {
    schema: z.object({ p_booking: uuid, p_reason: text(3) }),
    rpc: "cancel_booking",
    tab: "bookings",
  },
};
function back(form: FormData, fallback: string) {
  const path = String(form.get("return_to") ?? "");
  return /^\/dashboard\/(bookings\/[a-f0-9-]{36}|[a-z]+)$/.test(path)
    ? path
    : "/dashboard/" + fallback;
}
function safeError(raw: string) {
  const allowed = [
    "Not permitted",
    "Administrator verification required",
    "Provider is ineligible or unavailable for this visit",
    "Visit can start within 30 minutes of its scheduled time",
    "No authorised session records in this period",
    "Provider unavailable at the new time",
    "Cancellation cutoff reached. Contact support.",
    "Reassign confirmed visits before adding time off",
    "Reassign or cancel associated visits first",
    "Complete profile, eligible service and current credential required",
    "Verify your authenticator before requiring MFA",
  ];
  return allowed.includes(raw)
    ? raw
    : "Unable to save. Check the fields, your access, and the current visit status. An overlapping time or duplicate entry may already exist.";
}
export async function careAction(form: FormData) {
  const { client } = await requireAccount();
  const op = String(form.get("op"));
  const definition = definitions[op];
  if (!definition) redirect("/dashboard");
  const values: Record<string, unknown> = Object.fromEntries(form);
  if (op === "provider") {
    values.p_areas = String(form.get("p_areas") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    values.p_services = form.getAll("p_services");
  }
  for (const name of ["p_start", "p_end"]) {
    if (
      typeof values[name] === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values[name] as string)
    ) {
      const { data: settings } = await client
        .from("settings")
        .select("timezone")
        .single();
      const offset =
        settings?.timezone === "UTC"
          ? "Z"
          : settings?.timezone === "Asia/Dubai"
            ? "+04:00"
            : "+05:00";
      values[name] = new Date(values[name] + ":00" + offset).toISOString();
    }
  }
  const destination = back(form, definition.tab);
  if (op === "report") {
    try {
      getSummaryAdapter();
    } catch {
      redirect(
        destination +
          "?error=The%20configured%20summary%20adapter%20is%20unavailable.%20Your%20original%20records%20are%20unchanged.",
      );
    }
  }
  const parsed = definition.schema.safeParse(values);
  if (!parsed.success)
    redirect(
      destination +
        "?error=" +
        encodeURIComponent(
          parsed.error.issues[0]?.message ?? "Check the form.",
        ),
    );
  const { data, error } = await client.rpc(
    definition.rpc,
    parsed.data as Record<string, unknown>,
  );
  revalidatePath("/dashboard", "layout");
  revalidatePath("/providers");
  revalidatePath("/services");
  if (error)
    redirect(
      destination + "?error=" + encodeURIComponent(safeError(error.message)),
    );
  if (op === "report")
    redirect(
      "/dashboard/reports?report=" +
        data +
        "&message=Report%20created.%20Review%20the%20source%20records%20before%20exporting.",
    );
  redirect(
    destination +
      "?message=" +
      encodeURIComponent(
        op === "pay"
          ? "Simulation recorded. No real money was charged."
          : "Changes saved successfully.",
      ),
  );
}
export async function uploadCredential(form: FormData) {
  const { client, profile } = await requireAccount();
  const fail = (m: string): never =>
    redirect("/dashboard/profile?error=" + encodeURIComponent(m));
  if (profile.role !== "provider") fail("Provider access required.");
  const file = form.get("document");
  const expiry = date.safeParse(form.get("expires_on"));
  const label = text(3, 100).safeParse(form.get("label"));
  if (
    !(file instanceof File) ||
    !expiry.success ||
    !label.success ||
    file.size === 0 ||
    file.size > 5 * 1024 * 1024
  )
    return fail(
      "Choose a PDF, JPEG or PNG up to 5 MB, a label, and an expiry date.",
    );
  if (expiry.data <= new Date().toISOString().slice(0, 10))
    return fail("Choose a future credential expiry date.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type =
    bytes.subarray(0, 5).toString() === "%PDF-"
      ? "application/pdf"
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? "image/jpeg"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : null;
  if (!type || type !== file.type)
    return fail("File content does not match a supported document type.");
  const path =
    profile.id +
    "/" +
    randomUUID() +
    "." +
    (type === "application/pdf"
      ? "pdf"
      : type === "image/jpeg"
        ? "jpg"
        : "png");
  const uploaded = await client.storage
    .from("credentials")
    .upload(path, bytes, { contentType: type, upsert: false });
  if (uploaded.error) fail("Document upload failed. Try again.");
  const registered = await client.rpc("register_credential", {
    p_path: path,
    p_expiry: expiry.data,
    p_label: label.data,
  });
  if (registered.error) {
    await client.storage.from("credentials").remove([path]);
    fail(
      "Document could not be registered. Check the expiry date and try again.",
    );
  }
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?message=Credential%20submitted%20for%20review.");
}
export async function createShare(
  _previous: { url?: string; error?: string },
  form: FormData,
): Promise<{ url?: string; error?: string }> {
  const { client } = await requireAccount();
  const parsed = z
    .object({ report: uuid, days: number(1, 30) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Choose a report and an expiry between 1 and 30 days." };
  const token = randomBytes(32).toString("hex");
  const { error } = await client.rpc("share_report", {
    p_report: parsed.data.report,
    p_hash: createHash("sha256").update(token).digest("hex"),
    p_expiry: new Date(Date.now() + parsed.data.days * 86400000).toISOString(),
  });
  if (error) return { error: "Review your own report before sharing." };
  revalidatePath("/dashboard/reports");
  return {
    url:
      (process.env.APP_ORIGIN ?? "http://127.0.0.1:3000") + "/share#" + token,
  };
}
