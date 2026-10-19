import { describe, expect, it } from "vitest";
import {
  boundedRequestText,
  RequestBodyTooLarge,
} from "../../src/lib/request-body";
import { authenticationBuckets } from "../../src/lib/database/auth-throttle";

describe("request boundaries", () => {
  it("rejects oversized actual bytes without trusting the declared length", async () => {
    for (const headers of [
      new Headers(),
      new Headers({ "content-length": "1" }),
    ]) {
      const request = new Request("https://example.test", {
        method: "POST",
        headers,
        body: "é".repeat(600),
      });
      await expect(boundedRequestText(request, 1024)).rejects.toBeInstanceOf(
        RequestBodyTooLarge,
      );
    }
  });
  it("preserves a bounded body when forwarding authentication requests", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      body: '{"name":"Care"}',
    });
    const text = await boundedRequestText(request, 1024);
    expect(await new Request(request, { body: text }).json()).toEqual({
      name: "Care",
    });
  });
  it("counts chunks before JSON parsing", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(600));
        controller.enqueue(new Uint8Array(600));
        controller.close();
      },
    });
    const request = new Request("https://example.test", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(boundedRequestText(request, 1024)).rejects.toBeInstanceOf(
      RequestBodyTooLarge,
    );
  });
});
describe("authentication throttling", () => {
  const secret = "synthetic-test-key";
  const headers = new Headers({
    cookie: "better-auth.session_token=synthetic-session",
    "x-vercel-forwarded-for": "192.0.2.10",
  });
  it("does not let extra email/token fields change the session password-check bucket", () => {
    expect(
      authenticationBuckets(
        "/verify-password",
        { email: "other@example.test", token: "different" },
        headers,
        secret,
        true,
      ),
    ).toEqual(
      authenticationBuckets("/verify-password", {}, headers, secret, true),
    );
  });
  it("shares a source budget across different accounts and ignores spoofed forwarded headers", () => {
    const first = authenticationBuckets(
      "/sign-in/email",
      { email: "first@example.test" },
      headers,
      secret,
      true,
    );
    const secondHeaders = new Headers(headers);
    secondHeaders.set("x-forwarded-for", "198.51.100.99");
    const second = authenticationBuckets(
      "/sign-in/email",
      { email: "second@example.test" },
      secondHeaders,
      secret,
      true,
    );
    expect(first[0].key).not.toBe(second[0].key);
    expect(first[1]).toEqual(second[1]);
    expect(first[1].key).not.toContain("192.0.2.10");
  });
});
