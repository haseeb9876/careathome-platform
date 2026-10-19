import type { NextConfig } from "next";
const config: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`,
  },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  serverExternalPackages: ["playwright", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/reports/*/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/**/*",
    ],
    "/api/payments/*/receipt": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/playwright-core/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value:
              "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; connect-src 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
