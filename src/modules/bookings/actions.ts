"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccount } from "@/modules/accounts/session";
import {
  bookingSchema,
  visitInstant,
  visitTimeError,
  type BookingFormState,
} from "./validation";
export async function requestBooking(
  _previous: BookingFormState,
  form: FormData,
): Promise<BookingFormState> {
  const { client, profile } = await requireAccount();
  if (profile.role !== "patient")
    redirect("/dashboard?message=Only%20patients%20can%20request%20visits.");
  const parsed = bookingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Check the service, date, area and address before sending your request.",
    };
  const v = parsed.data;
  const { data: settings, error: settingsError } = await client
    .from("settings")
    .select("timezone")
    .single();
  if (settingsError || !settings)
    return {
      error:
        "We could not check the visit settings. Your details are still here; please try again.",
    };
  const timeError = visitTimeError(v.start, settings.timezone);
  if (timeError) return { error: timeError };
  const start = visitInstant(v.start, settings.timezone)!;
  const { data: id, error } = await client.rpc("request_booking", {
    p_service: v.service,
    p_start: start.toISOString(),
    p_address: v.address,
    p_area: v.area,
    p_request_key: v.requestKey,
  });
  if (error || !id)
    return {
      error:
        "We could not save your request. Your details are still here. Check that the service is available and try again, or contact your care team.",
    };
  const preferred = z.uuid().safeParse(form.get("preferred"));
  if (preferred.success)
    await client.rpc("prefer_provider", {
      p_booking: id,
      p_provider: preferred.data,
    });
  revalidatePath("/dashboard", "layout");
  redirect(
    "/dashboard/bookings/" +
      id +
      "?message=Request%20saved.%20Your%20care%20team%20will%20coordinate%20confirmation.",
  );
}
export async function cancelBooking(form: FormData) {
  const { client } = await requireAccount();
  const parsed = z
    .object({ booking: z.uuid(), reason: z.string().trim().min(3).max(500) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    redirect("/dashboard?message=A%20cancellation%20reason%20is%20required.");
  const { error } = await client.rpc("cancel_booking", {
    p_booking: parsed.data.booking,
    p_reason: parsed.data.reason,
  });
  revalidatePath("/dashboard");
  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        error
          ? "Cancellation unavailable. The visit may be terminal or within the 24-hour cutoff."
          : "Booking cancelled.",
      ),
  );
}
export async function queueBooking(form: FormData) {
  const { client, profile } = await requireAccount();
  if (profile.role !== "admin") redirect("/dashboard");
  const id = z.uuid().safeParse(form.get("booking"));
  if (!id.success) redirect("/dashboard");
  const { error } = await client.rpc("queue_booking", { p_booking: id.data });
  revalidatePath("/dashboard");
  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        error
          ? "Unable to move request."
          : "Request moved to the assignment queue.",
      ),
  );
}
export async function updateProfile(form: FormData) {
  const { client } = await requireAccount();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(100),
      address: z.string().max(500),
      area: z.string().max(100),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    redirect("/dashboard?message=Check%20your%20profile%20fields.");
  const { error } = await client.rpc("update_patient_profile", {
    p_name: parsed.data.name,
    p_address: parsed.data.address,
    p_area: parsed.data.area,
  });
  revalidatePath("/dashboard");
  redirect(
    "/dashboard?message=" +
      encodeURIComponent(
        error ? "Profile could not be saved." : "Profile saved.",
      ),
  );
}
