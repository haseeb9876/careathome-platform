import { describe, expect, it } from "vitest";
import { authorizedOperator } from "../../src/lib/operations";
import { safeServerError } from "../../src/lib/telemetry";

describe("operational boundaries", () => {
  it("fails closed for missing, weak, malformed and incorrect credentials", () => {
    const secret = "a".repeat(64);
    expect(authorizedOperator(`Bearer ${secret}`, secret)).toBe(true);
    expect(authorizedOperator(null, secret)).toBe(false);
    expect(authorizedOperator("Bearer short", "short")).toBe(false);
    expect(authorizedOperator(`Basic ${secret}`, secret)).toBe(false);
    expect(authorizedOperator(`Bearer ${"b".repeat(64)}`, secret)).toBe(false);
    expect(authorizedOperator(`Bearer ${secret}`)).toBe(false);
  });
  it("restricts error telemetry to non-sensitive classifications", () => {
    expect(
      safeServerError("private@example.test", "patient/123", "secret"),
    ).toEqual({
      event: "server_request_failed",
      digest: "unavailable",
      routeType: "unknown",
      method: "unknown",
    });
    expect(safeServerError("123456", "action", "POST").digest).toBe("123456");
  });
});
