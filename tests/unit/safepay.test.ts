import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import {
  checkoutUrl,
  createTracker,
  paymentMode,
  safepayConfig,
  verifiedEvent,
} from "../../src/modules/payments/safepay";
const env = {
  PAYMENT_MODE: "safepay_sandbox",
  APP_ORIGIN: "http://127.0.0.1:3000",
  SAFEPAY_PUBLIC_KEY: "sec_synthetic-merchant",
  SAFEPAY_SECRET_KEY: "synthetic-secret-only",
  SAFEPAY_WEBHOOK_SECRET: "synthetic-webhook-secret",
};
const config = safepayConfig(env);
const id = "10000000-0000-4000-8000-000000000001";
const tracker = "track_synthetic-tracker";
function payload(type = "payment.succeeded", overrides = {}) {
  return JSON.stringify({
    token: "evt_synthetic-event",
    type,
    merchant_api_key: env.SAFEPAY_PUBLIC_KEY,
    data: {
      tracker,
      state: "TRACKER_ENDED",
      amount: 350000,
      currency: "PKR",
      ...overrides,
    },
  });
}
const sign = (raw: string) =>
  createHmac("sha512", config.webhookSecret).update(raw).digest("hex");
describe("Safepay boundaries", () => {
  it("defaults to simulation and requires explicit live acceptance", () => {
    expect(paymentMode({})).toBe("simulation");
    expect(() => safepayConfig({})).toThrow();
    expect(() =>
      safepayConfig({ ...env, PAYMENT_MODE: "safepay_live" }),
    ).toThrow();
    expect(() => safepayConfig({ ...env, PAYMENT_MODE: "other" })).toThrow();
    expect(() =>
      safepayConfig({ ...env, APP_ORIGIN: "https://example.com/evil" }),
    ).toThrow();
    expect(() => safepayConfig({ ...env, SAFEPAY_SECRET_KEY: "" })).toThrow();
  });
  it("uses documented server API and integer PKR totals without personal data", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: { tracker: { token: tracker } } }),
      );
    expect(
      await createTracker(config, { id, amount_minor: 350000 }, fetcher),
    ).toBe(tracker);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://sandbox.api.getsafepay.com/order/payments/v3/");
    expect(JSON.parse(options!.body as string)).toMatchObject({
      currency: "PKR",
      amount: 350000,
      include_fees: false,
      metadata: { order_id: id },
    });
    expect(options!.redirect).toBe("error");
    await expect(
      createTracker(config, { id, amount_minor: 1.5 }, fetcher),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not redirect to an arbitrary provider URL or trust an arbitrary return path", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ data: "synthetic-short-lived-token" }),
      );
    const url = new URL(await checkoutUrl(config, tracker, id, fetcher));
    expect(url.origin).toBe("https://sandbox.api.getsafepay.com");
    expect(url.pathname).toBe("/embedded/");
    expect(url.searchParams.get("redirect_url")).toContain(
      `/dashboard/bookings/${id}`,
    );
    expect(url.toString()).not.toContain(config.secret);
    await expect(
      checkoutUrl(config, "https://evil.example", id, fetcher),
    ).rejects.toThrow();
  });
  it("rejects provider errors and malformed tracker responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 503 }));
    await expect(
      createTracker(config, { id, amount_minor: 1 }, fetcher),
    ).rejects.toThrow("unavailable");
    fetcher.mockResolvedValue(
      Response.json({ data: { tracker: { token: "untrusted" } } }),
    );
    await expect(
      createTracker(config, { id, amount_minor: 1 }, fetcher),
    ).rejects.toThrow();
  });
  it("authenticates exact raw bytes and merchant before accepting capture", () => {
    const raw = payload();
    expect(verifiedEvent(raw, sign(raw), config).data.amount).toBe(350000);
    expect(() => verifiedEvent(raw + " ", sign(raw), config)).toThrow();
    expect(() => verifiedEvent(raw, "0".repeat(128), config)).toThrow();
    expect(() => verifiedEvent(raw, null, config)).toThrow();
    const foreign = raw.replace(env.SAFEPAY_PUBLIC_KEY, "sec_foreign-merchant");
    expect(() => verifiedEvent(foreign, sign(foreign), config)).toThrow();
  });
  it("rejects wrong currency, authorization-only and invalid refund totals", () => {
    for (const raw of [
      payload("payment.succeeded", { currency: "USD" }),
      payload("payment.succeeded", { state: "TRACKER_AUTHORIZED" }),
      payload("payment.refunded", {
        state: "TRACKER_PARTIAL_REFUND",
        balance: -1,
      }),
    ]) {
      expect(() => verifiedEvent(raw, sign(raw), config)).toThrow();
    }
    const raw = payload("payment.refunded", {
      state: "TRACKER_PARTIAL_REFUND",
      balance: 340000,
    });
    expect(verifiedEvent(raw, sign(raw), config).data.balance).toBe(340000);
  });
});
