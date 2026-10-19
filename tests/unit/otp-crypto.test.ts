import { describe, expect, it } from "vitest";
import {
  newOtp,
  operationDigest,
  otpDigest,
} from "../../src/modules/accounts/otp-crypto";
describe("operation-bound OTP digests", () => {
  it("generates six digits and a separately keyed hash", () => {
    const value = newOtp("test-secret");
    expect(value.code).toMatch(/^\d{6}$/);
    expect(value.hash).toBe(
      otpDigest(`${value.id}:${value.code}`, "test-secret"),
    );
    expect(value.hash).not.toBe(
      otpDigest(`${value.id}:${value.code}`, "other-secret"),
    );
    expect(newOtp("test-secret").id).not.toBe(value.id);
  });
  it("binds verification to the operation, session and exact values", () => {
    const original = operationDigest(
      "email",
      { session: "one", email: "new@example.test" },
      "secret",
    );
    expect(
      operationDigest(
        "email",
        { email: "new@example.test", session: "one" },
        "secret",
      ),
    ).toBe(original);
    expect(
      operationDigest(
        "admin",
        { session: "one", email: "new@example.test" },
        "secret",
      ),
    ).not.toBe(original);
    expect(
      operationDigest(
        "email",
        { session: "two", email: "new@example.test" },
        "secret",
      ),
    ).not.toBe(original);
    expect(
      operationDigest(
        "email",
        { session: "one", email: "other@example.test" },
        "secret",
      ),
    ).not.toBe(original);
  });
});
