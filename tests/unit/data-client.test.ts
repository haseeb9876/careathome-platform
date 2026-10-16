import { describe, expect, it, vi } from "vitest";
import { createDataClient } from "../../src/lib/database/data-client";
describe("Neon application query boundary", () => {
  it("keeps attacker-controlled values outside SQL text", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await createDataClient(execute)
      .from("profiles")
      .select("id")
      .eq("name", "'; drop table profiles; --");
    expect(execute.mock.calls[0][0]).toBe(
      'SELECT "id" FROM public."profiles" WHERE "name" = $1 LIMIT 1000',
    );
    expect(execute.mock.calls[0][1]).toEqual(["'; drop table profiles; --"]);
  });
  it("rejects private tables and identifier injection", () => {
    const client = createDataClient(vi.fn());
    expect(() => client.from("identity_users")).toThrow();
    expect(() => client.from("profiles").select("id;delete")).toThrow();
    expect(() => client.from("profiles").order("id desc;--")).toThrow();
  });
  it("never invokes an unapproved RPC", async () => {
    const execute = vi.fn();
    expect(
      (await createDataClient(execute).rpc("claim_emails")).error,
    ).toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
  });
  it("binds RPC parameters and rejects malformed argument names", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ result: "id" }] });
    const client = createDataClient(execute);
    await client.rpc("cancel_booking", { p_booking: "id", p_reason: "reason" });
    expect(execute.mock.calls[0][0]).toBe(
      'SELECT public."cancel_booking"("p_booking" => $1,"p_reason" => $2) AS result',
    );
    expect(
      (await client.rpc("cancel_booking", { "p_reason)": 1 })).error,
    ).toBeTruthy();
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it("does not hide duplicate rows behind single-record reads", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });
    expect(
      (await createDataClient(execute).from("profiles").single()).error,
    ).toBeTruthy();
  });
  it("normalizes dates and bounds result sizes", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({ rows: [{ created_at: new Date("2026-01-01Z") }] });
    const client = createDataClient(execute);
    expect((await client.from("profiles")).data?.[0].created_at).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(() => client.from("profiles").limit(1001)).toThrow();
  });
});
