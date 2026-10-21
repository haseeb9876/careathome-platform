import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export function paymentMode(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const mode = env.PAYMENT_MODE ?? "simulation";
  if (!["simulation", "safepay_sandbox", "safepay_live"].includes(mode))
    throw new Error("Invalid payment configuration");
  return mode;
}
export function safepayConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const mode = paymentMode(env);
  if (mode === "simulation") throw new Error("Online payments are not enabled");
  if (
    mode === "safepay_live" &&
    (env.PAYMENTS_LIVE_APPROVED !== "true" ||
      env.APP_DEPLOYMENT_MODE !== "production")
  )
    throw new Error("Live payment acceptance is not approved");
  const origin = new URL(env.APP_ORIGIN ?? "http://127.0.0.1:3000");
  if (
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/" ||
    (origin.protocol !== "https:" &&
      !(
        mode === "safepay_sandbox" && origin.origin === "http://127.0.0.1:3000"
      ))
  )
    throw new Error("Invalid payment return origin");
  const publicKey = env.SAFEPAY_PUBLIC_KEY;
  const secret = env.SAFEPAY_SECRET_KEY;
  const webhookSecret = env.SAFEPAY_WEBHOOK_SECRET;
  if (
    !publicKey ||
    !/^sec_[a-zA-Z0-9-]+$/.test(publicKey) ||
    !secret ||
    secret.length < 16 ||
    !webhookSecret ||
    webhookSecret.length < 16
  )
    throw new Error("Merchant credentials are not configured");
  const intent = env.SAFEPAY_INTENT ?? "CYBERSOURCE";
  if (!["CYBERSOURCE", "MPGS"].includes(intent))
    throw new Error("Invalid payment channel");
  const environment = mode === "safepay_live" ? "production" : "sandbox";
  return {
    environment,
    publicKey,
    secret,
    webhookSecret,
    intent,
    origin: origin.origin,
    api:
      environment === "production"
        ? "https://api.getsafepay.com"
        : "https://sandbox.api.getsafepay.com",
    checkout:
      environment === "production"
        ? "https://getsafepay.com/embedded/"
        : "https://sandbox.api.getsafepay.com/embedded/",
  };
}
export type SafepayConfig = ReturnType<typeof safepayConfig>;
const trackerId = z.string().regex(/^track_[a-zA-Z0-9-]{8,100}$/);
export async function createTracker(
  config: SafepayConfig,
  order: { id: string; amount_minor: number },
  fetcher = fetch,
) {
  if (
    !Number.isSafeInteger(order.amount_minor) ||
    order.amount_minor < 1 ||
    order.amount_minor > 2147483647 ||
    !z.uuid().safeParse(order.id).success
  )
    throw new Error("Invalid payment amount or order");
  const body = await request(
    config,
    "/order/payments/v3/",
    {
      merchant_api_key: config.publicKey,
      intent: config.intent,
      mode: "payment",
      entry_mode: "raw",
      currency: "PKR",
      amount: order.amount_minor,
      metadata: { order_id: order.id },
      include_fees: false,
    },
    fetcher,
  );
  return z
    .object({ data: z.object({ tracker: z.object({ token: trackerId }) }) })
    .parse(body).data.tracker.token;
}
async function request(
  config: SafepayConfig,
  path: string,
  body: object,
  fetcher: typeof fetch,
) {
  const response = await fetcher(config.api + path, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      "X-SFPY-MERCHANT-SECRET": config.secret,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Payment provider unavailable");
  return response.json();
}
export async function checkoutUrl(
  config: SafepayConfig,
  tracker: string,
  booking: string,
  fetcher = fetch,
) {
  trackerId.parse(tracker);
  z.uuid().parse(booking);
  const body = await request(config, "/client/passport/v1/token", {}, fetcher);
  const token = z
    .object({ data: z.string().min(16).max(4096) })
    .parse(body).data;
  const url = new URL(config.checkout);
  url.search = new URLSearchParams({
    environment: config.environment,
    tracker,
    tbt: token,
    source: "hosted",
    redirect_url: `${config.origin}/dashboard/bookings/${booking}?message=Payment%20confirmation%20is%20being%20checked.%20Refresh%20to%20see%20the%20verified%20status.`,
    cancel_url: `${config.origin}/dashboard/bookings/${booking}?message=Checkout%20closed.%20Any%20completed%20payment%20will%20be%20confirmed%20by%20the%20provider.`,
  }).toString();
  return url.toString();
}
export function verifiedEvent(
  raw: string,
  signature: string | null,
  config: SafepayConfig,
) {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature))
    throw new Error("Invalid notification");
  const expected = createHmac("sha512", config.webhookSecret)
    .update(raw)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new Error("Invalid notification");
  const event = z
    .object({
      token: z.string().regex(/^evt_[a-zA-Z0-9-]{8,100}$/),
      merchant_api_key: z.literal(config.publicKey),
      type: z.string().max(80),
      data: z.object({
        tracker: trackerId,
        state: z.string().max(80).optional(),
        amount: z.number().int().positive().max(2147483647).optional(),
        balance: z.number().int().nonnegative().max(2147483647).optional(),
        currency: z.literal("PKR").optional(),
      }),
    })
    .parse(JSON.parse(raw));
  if (
    event.type === "payment.succeeded" &&
    (event.data.state !== "TRACKER_ENDED" ||
      !event.data.amount ||
      !event.data.currency)
  )
    throw new Error("Invalid capture");
  if (
    event.type === "payment.refunded" &&
    (event.data.balance === undefined ||
      !event.data.currency ||
      !["TRACKER_REFUNDED", "TRACKER_PARTIAL_REFUND"].includes(
        event.data.state ?? "",
      ))
  )
    throw new Error("Invalid refund");
  return event;
}
