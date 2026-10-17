import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";
import type { Viewport } from "next";
import { AppInstall } from "@/components/app-install";
import { appearanceScript } from "@/lib/appearance";
export const viewport: Viewport = { themeColor: "#195c50" };
export const metadata: Metadata = {
  applicationName: "CareAtHome",
  appleWebApp: {
    capable: true,
    title: "CareAtHome",
    statusBarStyle: "default",
  },
  icons: { icon: "/icons/app-192.png", apple: "/icons/apple-touch-icon.png" },
  title: {
    default: "CareAtHome | A little closer to feeling better",
    template: "%s · CareAtHome",
  },
  description:
    "Thoughtful home nursing and physiotherapy, with your care journey in one place. Demonstration.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        <AppInstall />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
