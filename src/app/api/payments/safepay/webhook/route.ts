import { authenticationPool } from "@/lib/database/auth-server";
import { boundedRequestText, RequestBodyTooLarge } from "@/lib/request-body";
import { safepayConfig, verifiedEvent } from "@/modules/payments/safepay";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let config;
  try {
    config = safepayConfig();
  } catch {
    return Response.json({ error: "Payments unavailable" }, { status: 503 });
  }
  let event;
  try {
    const raw = await boundedRequestText(request, 32768);
    event = verifiedEvent(raw, request.headers.get("x-sfpy-signature"), config);
  } catch (error) {
    return Response.json(
      { error: "Invalid notification" },
      { status: error instanceof RequestBodyTooLarge ? 413 : 400 },
    );
  }
  if (
    ![
      "payment.succeeded",
      "payment.failed",
      "payment.refunded",
      "void.succeeded",
    ].includes(event.type)
  )
    return Response.json({ received: true });
  try {
    await authenticationPool().query(
      "select private.gateway_event($1,$2,$3,$4,$5,$6,$7)",
      [
        config.environment,
        event.token,
        event.data.tracker,
        event.type,
        event.data.amount ?? null,
        event.data.currency ?? null,
        event.data.balance ?? null,
      ],
    );
    return Response.json({ received: true });
  } catch {
    // Non-2xx deliberately requests provider redelivery after a transient failure.
    return Response.json(
      { error: "Notification could not be recorded" },
      { status: 503 },
    );
  }
}
