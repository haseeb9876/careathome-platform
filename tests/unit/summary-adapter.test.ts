import { describe, it, expect, afterEach } from "vitest";
import { getSummaryAdapter } from "../../src/modules/reports/adapter";
afterEach(() => {
  delete process.env.CARE_SUMMARY_ADAPTER;
});
describe("summary configuration boundary", () => {
  it("uses only the local, non-network adapter by default", () => {
    expect(getSummaryAdapter()).toMatchObject({
      name: "local-template-v1",
      externalDataTransfer: false,
    });
  });
  it("rejects an unavailable external adapter instead of sending records", () => {
    process.env.CARE_SUMMARY_ADAPTER = "remote-ai";
    expect(() => getSummaryAdapter()).toThrow(
      "original care records are unchanged",
    );
  });
});
