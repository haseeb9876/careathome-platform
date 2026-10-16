import { z } from "zod";
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
export const definitions: Record<
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
