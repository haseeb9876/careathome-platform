"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAccount } from "@/modules/accounts/session";
import { bookingSchema } from "./validation";
export async function requestBooking(form: FormData) {
  const { client, profile } = await requireAccount();
  if (profile.role !== "patient")
    redirect("/dashboard?message=Only%20patients%20can%20request%20visits.");
  const parsed = bookingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    redirect("/dashboard/new?error=Check%20the%20booking%20details.");
  const v = parsed.data;
  const { data: settings } = await client
    .from("settings")
    .select("timezone")
    .single();
  const start = new Date(
    v.start +
      ":00" +
      (settings?.timezone === "UTC"
        ? "Z"
        : settings?.timezone === "Asia/Dubai"
          ? "+04:00"
          : "+05:00"),
  );
  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now())
    redirect("/dashboard/new?error=Choose%20a%20future%20visit.");
  const { data: id, error } = await client.rpc("request_booking", {
    p_service: v.service,
    p_start: start.toISOString(),
    p_address: v.address,
    p_area: v.area,
    p_request_key: v.requestKey,
  });
  if (error)
    redirect(
      "/dashboard/new?error=Unable%20to%20save%20request.%20Check%20the%20service%20and%20choose%20a%20time%20within%20180%20days.",
    );
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
