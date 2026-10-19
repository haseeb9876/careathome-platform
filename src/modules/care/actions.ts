"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "node:crypto";
import { requireAccount } from "@/modules/accounts/session";
import { getSummaryAdapter } from "@/modules/reports/adapter";
import { definitions } from "./action-definitions";
import { securitySession } from "@/modules/accounts/security";
import { consumeOtp, securityNotice } from "@/modules/accounts/otp";
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
  const { client, user } = await requireAccount();
  const op = String(form.get("op"));
  const definition = Object.hasOwn(definitions, op)
    ? definitions[op]
    : undefined;
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
  if (op === "settings" || op === "account") {
    let denied = false;
    try {
      const session = await securitySession(
        String(form.get("current_password") ?? ""),
        true,
      );
      await consumeOtp(form, session.user.email, op, session.session.id);
    } catch {
      denied = true;
    }
    if (denied)
      redirect(
        destination +
          "?error=Verify%20your%20password%2C%20authenticator%20and%20email%20code%20for%20these%20exact%20changes.",
      );
  }
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
  if (op === "settings" || op === "account")
    await securityNotice(
      user.email,
      "Administrator security settings or account access were changed.",
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
export async function createShare(
  _previous: { url?: string; error?: string },
  form: FormData,
): Promise<{ url?: string; error?: string }> {
  const { client } = await requireAccount();
  const parsed = z
    .object({ report: z.uuid(), days: z.coerce.number().int().min(1).max(30) })
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
