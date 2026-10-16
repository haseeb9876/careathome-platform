import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  serverExternalPackages: ["playwright", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/reports/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/payments/*/receipt": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
