import { describe, expect, it } from "vitest";
import { androidAssetLinks } from "../../src/lib/android-links";

describe("Android website association", () => {
  const fingerprint = Array(32).fill("AB").join(":");
  it("does not trust a package until a real certificate is configured", () => {
    expect(androidAssetLinks({})).toEqual([]);
    expect(() =>
      androidAssetLinks({ ANDROID_PACKAGE_ID: "app.careathome.demo" }),
    ).toThrow();
    expect(() =>
      androidAssetLinks({ ANDROID_SHA256_CERT_FINGERPRINTS: fingerprint }),
    ).toThrow();
  });
  it("normalizes and deduplicates certificates without widening package trust", () => {
    const entries = androidAssetLinks({
      ANDROID_PACKAGE_ID: "app.careathome.demo",
      ANDROID_SHA256_CERT_FINGERPRINTS: `${fingerprint.toLowerCase()}, ${fingerprint}`,
    });
    expect(entries[0].target.sha256_cert_fingerprints).toEqual([fingerprint]);
    expect(entries[0].target.package_name).toBe("app.careathome.demo");
    expect(() =>
      androidAssetLinks({
        ANDROID_PACKAGE_ID: "*",
        ANDROID_SHA256_CERT_FINGERPRINTS: fingerprint,
      }),
    ).toThrow();
  });
});
