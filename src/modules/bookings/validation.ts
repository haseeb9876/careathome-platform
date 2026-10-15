import { z } from "zod";
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
