"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, ArrowUpRight } from "lucide-react";
import { AppearanceControl } from "./appearance";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-icon">
        <HeartPulse size={23} />
      </span>
      CareAtHome<span className="brand-dot">.</span>
    </Link>
  );
}
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const workspace = usePathname().startsWith("/dashboard");
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      {!workspace && (
        <header className="header">
          <Brand />
          <div className="public-appearance">
            <AppearanceControl />
          </div>
          <nav aria-label="Main navigation">
            <Link href="/services">Our services</Link>
            <Link href="/providers">Find a professional</Link>
            <Link href="/#how-it-works" className="desktop-link">
              How it works
            </Link>
            <Link className="nav-signin" href="/dashboard">
              My care space <ArrowUpRight size={15} />
            </Link>
          </nav>
        </header>
      )}
      <div
        id={workspace ? undefined : "content"}
        tabIndex={workspace ? undefined : -1}
      >
        {children}
      </div>
      {!workspace && (
        <footer>
          <Brand />
          <p>Thoughtful care. Familiar surroundings.</p>
          <small>
            Demonstration · Synthetic data only
            <br />
            Not an emergency service
          </small>
        </footer>
      )}
    </>
  );
}
