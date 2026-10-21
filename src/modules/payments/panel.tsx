import Link from "next/link";
import { Panel } from "@/components/care-ui";
import { SubmitButton } from "@/components/submit-button";
import { money } from "@/lib/utils";
import { startCheckout } from "./actions";
import { paymentMode } from "./safepay";
import type { db } from "@/lib/database/server";
export const gatewayColumns =
  "id,booking_id,amount_minor,currency,environment,status,refunded_minor,created_at,updated_at";
export async function CheckoutPanel({
  client,
  booking,
  payable,
}: {
  client: Awaited<ReturnType<typeof db>>;
  booking: string;
  payable: boolean;
}) {
  const { data: payment, error } = await client
    .from("gateway_payments")
    .select(gatewayColumns)
    .eq("booking_id", booking)
    .maybeSingle();
  if (error)
    return (
      <Panel title="Online payment">
        <p>
          Payment status is temporarily unavailable. Please try again before
          making a payment.
        </p>
      </Panel>
    );
  const mode = paymentMode();
  if (mode === "simulation" && !payment) return null;
  return (
    <Panel title="Online payment">
      <p className="notice">
        {mode === "safepay_sandbox" || payment?.environment === "sandbox"
          ? "Payment-provider sandbox. Use test payment details only; this is not a real charge."
          : "Payment details are entered securely on Safepay. A return to this page does not by itself confirm a payment."}
      </p>
      {payment && (
        <p role="status">
          {payment.status} · {money(payment.amount_minor, payment.currency)}
          {payment.refunded_minor > 0 && (
            <> · Refunded {money(payment.refunded_minor, payment.currency)}</>
          )}
        </p>
      )}
      {payable &&
        mode !== "simulation" &&
        (!payment ||
          ["Initializing", "Pending", "Failed"].includes(payment.status)) && (
          <form action={startCheckout}>
            <input type="hidden" name="booking" value={booking} />
            <SubmitButton>
              {payment ? "Continue secure checkout" : "Pay securely"}
            </SubmitButton>
          </form>
        )}
      <p className="muted mt-3">
        Confirmation comes from the payment provider. Refresh this page to check
        the latest status. Payments do not change your visit status.
      </p>
      <Link className="text-link" href="/dashboard/support">
        Get help with a payment or refund
      </Link>
    </Panel>
  );
}
