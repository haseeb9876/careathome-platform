/** Only certificates deliberately configured by the owner establish app trust. */
export function androidAssetLinks(env: Record<string, string | undefined>) {
  const packageName = env.ANDROID_PACKAGE_ID;
  const raw = env.ANDROID_SHA256_CERT_FINGERPRINTS;
  if (!packageName && !raw) return [];
  if (
    !packageName ||
    !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(packageName)
  )
    throw new Error("Invalid Android association configuration.");
  const fingerprints = [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (
    fingerprints.length < 1 ||
    fingerprints.length > 3 ||
    fingerprints.some((v) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(v))
  )
    throw new Error("Invalid Android association configuration.");
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
