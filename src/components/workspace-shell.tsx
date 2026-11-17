"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  FileHeart,
  Files,
  Wallet,
  Star,
  MessagesSquare,
  Bell,
  UserRound,
  Users,
  Stethoscope,
  Settings,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ChevronRight,
  HeartHandshake,
} from "lucide-react";
import { Brand } from "./site-chrome";
import { AppearanceControl } from "./appearance";
import { logout } from "@/modules/accounts/actions";
import { initials } from "@/lib/format";
import type { Profile } from "@/modules/care/types";
const links = [
  {
    path: "",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["patient", "provider", "admin"],
  },
  {
    path: "bookings",
    label: "Visits & bookings",
    icon: CalendarDays,
    roles: ["patient", "provider", "admin"],
  },
  {
    path: "schedule",
    label: "My availability",
    icon: CalendarDays,
    roles: ["provider"],
  },
  {
    path: "records",
    label: "Care timeline",
    icon: FileHeart,
    roles: ["patient", "provider"],
  },
  {
    path: "reports",
    label: "Reports & sharing",
    icon: Files,
    roles: ["patient", "provider"],
  },
  {
    path: "providers",
    label: "Care professionals",
    icon: Stethoscope,
    roles: ["admin"],
  },
  { path: "users", label: "People & access", icon: Users, roles: ["admin"] },
  {
    path: "services",
    label: "Service catalogue",
    icon: HeartHandshake,
    roles: ["admin"],
  },
  {
    path: "payments",
    label: "Payments",
    icon: Wallet,
    roles: ["patient", "admin"],
  },
  {
    path: "reviews",
    label: "Reviews",
    icon: Star,
    roles: ["patient", "provider", "admin"],
  },
  {
    path: "support",
    label: "Help & support",
    icon: MessagesSquare,
    roles: ["patient", "provider", "admin"],
  },
  {
    path: "notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["patient", "provider", "admin"],
  },
  {
    path: "profile",
    label: "My profile",
    icon: UserRound,
    roles: ["patient", "provider"],
  },
  {
    path: "settings",
    label: "Settings & security",
    icon: Settings,
    roles: ["patient", "provider", "admin"],
  },
  {
    path: "audit",
    label: "Audit activity",
    icon: ShieldCheck,
    roles: ["admin"],
  },
];
export function WorkspaceShell({
  profile,
  unread,
  children,
}: {
  profile: Profile;
  unread: number;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = menuButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        navigation.current?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const media = matchMedia("(max-width: 760px)");
    const onResize = () => {
      if (!media.matches) setOpen(false);
    };
    media.addEventListener("change", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onResize);
      trigger?.focus();
    };
  }, [open]);
  const active = links.find(
    (l) => l.path && path.startsWith("/dashboard/" + l.path),
  );
  return (
    <div className="workspace">
      <button
        className={"sidebar-scrim " + (open ? "visible" : "")}
        aria-label="Close navigation"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <aside
        id="workspace-navigation"
        ref={navigation}
        className={"sidebar " + (open ? "is-open" : "")}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-label">
          {profile.role === "admin"
            ? "OPERATIONS"
            : profile.role === "provider"
              ? "PROFESSIONAL SPACE"
              : "YOUR CARE SPACE"}
        </p>
        <nav aria-label="Workspace navigation">
          {links
            .filter((l) => l.roles.includes(profile.role))
            .map((l) => (
              <Link
                key={l.path}
                onClick={() => setOpen(false)}
                aria-current={
                  (
                    l.path
                      ? path.startsWith("/dashboard/" + l.path)
                      : path === "/dashboard"
                  )
                    ? "page"
                    : undefined
                }
                href={"/dashboard" + (l.path ? "/" + l.path : "")}
              >
                <l.icon size={18} />
                <span>{l.label}</span>
                {l.path === "notifications" && unread > 0 && <b>{unread}</b>}
              </Link>
            ))}
        </nav>
        <div className="sidebar-help">
          <HeartHandshake size={23} />
          <strong>A little support goes a long way.</strong>
          <Link href="/dashboard/support" onClick={() => setOpen(false)}>
            Talk to your care team <ChevronRight size={14} />
          </Link>
        </div>
        <div className="sidebar-account">
          <span className="avatar">{initials(profile.name)}</span>
          <div>
            <strong>{profile.name}</strong>
            <small>{profile.role} account</small>
          </div>
          <form action={logout}>
            <button className="icon-button" aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace-body" inert={open}>
        <header className="workspace-topbar">
          <div>
            <button
              className="icon-button mobile-only"
              ref={menuButton}
              aria-controls="workspace-navigation"
              aria-label="Open navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              My workspace <ChevronRight size={13} />
              <strong>{active?.label ?? "Overview"}</strong>
            </span>
          </div>
          <div>
            <span className="local-indicator">
              <i />
              Demonstration
            </span>
            <AppearanceControl />
            <Link
              className="icon-button notification-button"
              href="/dashboard/notifications"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell size={20} />
              {unread > 0 && <i />}
            </Link>
            <span className="avatar">{initials(profile.name)}</span>
          </div>
        </header>
        <main id="content" tabIndex={-1} className="workspace-content">
          {children}
        </main>
        <div className="workspace-footer">
          <span>CareAtHome · Care, thoughtfully connected.</span>
          <span>Private workspace · Synthetic data</span>
        </div>
      </div>
    </div>
  );
}
