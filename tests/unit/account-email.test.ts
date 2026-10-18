import { afterEach, describe, expect, it, vi } from "vitest";
import { createDecipheriv } from "node:crypto";
import type { Pool } from "pg";
vi.mock("server-only", () => ({}));
import {
  sendAccountMail,
  canDeliverAccountEmail,
} from "../../src/modules/accounts/email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("account email transport", () => {
  it("keeps synthetic messages encrypted and never sends them externally", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(64));
    vi.stubEnv("EMAIL_DELIVERY", "resend");
    vi.stubEnv("RESEND_API_KEY", "synthetic-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await sendAccountMail({ query } as unknown as Pool, {
      to: "account@careathome.test",
      subject: "Verification",
      text: "Synthetic message",
      url: "https://example.test/#secret-token",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const encrypted = query.mock.calls[0][1][1];
    expect(encrypted).not.toContain("secret-token");
    const bytes = Buffer.from(encrypted, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from("a".repeat(64), "hex"),
      bytes.subarray(0, 12),
    );
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
    expect(data.url).toBe("https://example.test/#secret-token");
  });
  it("refuses real recipients until delivery is configured", async () => {
    vi.stubEnv("EMAIL_DELIVERY", "development");
    expect(canDeliverAccountEmail("person@example.com")).toBe(false);
    await expect(
      sendAccountMail({} as Pool, {
        to: "person@example.com",
        subject: "Test",
        text: "Test",
      }),
    ).rejects.toThrow("not configured");
  });
  it("does not report success when the provider rejects delivery", async () => {
    vi.stubEnv("EMAIL_DELIVERY", "resend");
    vi.stubEnv("RESEND_API_KEY", "synthetic-key");
    vi.stubEnv("EMAIL_FROM", "test@example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(
      sendAccountMail({} as Pool, {
        to: "person@example.com",
        subject: "Test",
        text: "Test",
      }),
    ).rejects.toThrow();
  });
});
