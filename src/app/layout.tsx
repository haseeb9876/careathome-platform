import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";
export const metadata: Metadata = {
  title: {
    default: "CareAtHome | A little closer to feeling better",
    template: "%s · CareAtHome",
  },
  description:
    "Thoughtful home nursing and physiotherapy, with your care journey in one place. Local demonstration.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
