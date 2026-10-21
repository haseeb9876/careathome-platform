"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { securitySession } from "@/modules/accounts/security";
import { authenticationPool } from "@/lib/database/auth-server";
import { checkoutUrl, createTracker, safepayConfig } from "./safepay";

export async function startCheckout(form: FormData) {
  const booking = z.uuid().parse(form.get("booking"));
  const session = await securitySession();
  let destination = "";
  try {
    const config = safepayConfig();
    const pool = authenticationPool();
    const {
      rows: [payment],
    } = await pool.query("select * from private.gateway_begin($1,$2,$3)", [
      session.session.id,
      booking,
      config.environment,
    ]);
    if (!["Initializing", "Pending", "Failed"].includes(payment.status)) {
      destination = `/dashboard/bookings/${booking}`;
    } else {
      let tracker = payment.tracker as string | null;
      if (!tracker) {
        tracker = await createTracker(config, {
          id: payment.id,
          amount_minor: payment.amount_minor,
        });
        await pool.query("select private.gateway_bind($1,$2,$3,$4)", [
          session.session.id,
          payment.id,
          payment.setup_nonce,
          tracker,
        ]);
      }
      destination = await checkoutUrl(config, tracker, booking);
    }
  } catch {
    // Neither provider responses nor checkout URLs/tokens belong in logs.
    destination = `/dashboard/bookings/${booking}?error=Checkout%20could%20not%20start.%20Wait%20two%20minutes%20and%20try%20again%2C%20or%20contact%20support.%20Check%20your%20payment%20status%20before%20retrying.`;
  }
  redirect(destination);
}
