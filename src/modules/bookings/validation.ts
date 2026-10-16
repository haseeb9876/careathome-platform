import { z } from "zod";
export type BookingFormState = { error?: string };

/** Reject JavaScript's rollover dates before applying the configured service timezone. */
export function visitInstant(value: string, timezone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const calendar = new Date(value + ":00Z");
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 16) !== value
  )
    return null;
  const offsets: Record<string, string> = {
    UTC: "Z",
    "Asia/Dubai": "+04:00",
    "Asia/Karachi": "+05:00",
  };
  const offset = offsets[timezone];
  return offset ? new Date(value + ":00" + offset) : null;
}
export function visitTimeError(
  value: string,
  timezone: string,
  now = Date.now(),
): string | null {
  const instant = visitInstant(value, timezone);
  if (!instant) return "Enter a valid date and time.";
  if (instant.getTime() <= now) return "Choose a future date and time.";
  if (instant.getTime() > now + 180 * 86400000)
    return "Choose a visit within the next 180 days.";
  return null;
}
export const bookingSchema = z.object({
  service: z.uuid(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  address: z.string().trim().min(5).max(500),
  area: z.string().trim().min(2).max(100),
  requestKey: z.uuid(),
});
export const states = [
  "Requested",
  "Pending Assignment",
  "Confirmed",
  "In Progress",
  "Completed",
  "Cancelled",
  "Reassignment Required",
] as const;
export type BookingStatus = (typeof states)[number];
const transitions: Record<BookingStatus, readonly BookingStatus[]> = {
  Requested: ["Pending Assignment", "Cancelled"],
  "Pending Assignment": ["Confirmed", "Cancelled"],
  Confirmed: ["In Progress", "Reassignment Required", "Cancelled"],
  "In Progress": ["Completed"],
  Completed: [],
  Cancelled: [],
  "Reassignment Required": ["Confirmed", "Cancelled"],
};
export function canTransition(from: BookingStatus, to: BookingStatus) {
  return transitions[from].includes(to);
}

export const bookingGuidance: Record<BookingStatus, string> = {
  Requested:
    "We have received your request. Your care team will review the details before confirming a professional and time.",
  "Pending Assignment":
    "Your care team is finding an eligible professional. This visit is not confirmed yet.",
  Confirmed:
    "Your visit is confirmed. Check the time, address and assigned professional below before the visit.",
  "In Progress":
    "Your professional has started the visit. The session record will be available after completion.",
  Completed:
    "This visit is complete. You can view your care record and leave a review in your workspace.",
  Cancelled:
    "This visit has been cancelled and will not take place. You can request a new visit if you still need care.",
  "Reassignment Required":
    "Your previous professional is no longer assigned. Your care team must confirm a replacement before this visit can proceed.",
};

export function bookingStatusGuidance(status: string): string {
  return Object.hasOwn(bookingGuidance, status)
    ? bookingGuidance[status as BookingStatus]
    : "Contact your care team for an update on this visit.";
}
