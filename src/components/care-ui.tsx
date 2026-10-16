import Link from "next/link";
import {
  ArrowUpRight,
  Inbox,
  CalendarDays,
  MapPin,
  Clock3,
} from "lucide-react";
import { careAction } from "@/modules/care/actions";
import { SubmitButton } from "./submit-button";
import { money } from "@/lib/utils";
import { dateTime, initials } from "@/lib/format";
import type { Booking, Service } from "@/modules/care/types";
export function Badge({ status }: { status: string }) {
  const tone = [
    "Confirmed",
    "Verified",
    "Paid",
    "Completed",
    "Resolved",
  ].includes(status)
    ? "success"
    : ["Cancelled", "Rejected", "Suspended", "Failed"].includes(status)
      ? "danger"
      : [
            "Pending",
            "Requested",
            "Pending Assignment",
            "Reassignment Required",
            "Open",
          ].includes(status)
        ? "amber"
        : "neutral";
  return (
    <span className={"status-badge " + tone}>
      <i />
      {status}
    </span>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: "normal" | "large";
}) {
  return <span className={"avatar " + size}>{initials(name)}</span>;
}
export function Empty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Inbox size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Link className="primary-link" href={href}>
          {label ?? "Get started"}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <p className="eyebrow">{eyebrow ?? "YOUR CARE WORKSPACE"}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={"surface " + className}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
export function ActionForm({
  op,
  fields = {},
  children,
  label,
  back,
  variant = "default",
}: {
  op: string;
  fields?: Record<string, string | number>;
  children?: React.ReactNode;
  label: string;
  back?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <form action={careAction} className="form-stack">
      <input type="hidden" name="op" value={op} />
      {back && <input type="hidden" name="return_to" value={back} />}{" "}
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {children}
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}
export function BookingCard({
  booking,
  service,
  providerName,
  timezone,
}: {
  booking: Booking;
  service?: Service;
  providerName?: string;
  timezone?: string;
}) {
  return (
    <Link className="visit-card" href={"/dashboard/bookings/" + booking.id}>
      <div className="visit-icon">
        <CalendarDays size={23} />
      </div>
      <div className="visit-main">
        <div className="visit-title">
          <h3>{service?.name ?? "Home care visit"}</h3>
          <Badge status={booking.status} />
        </div>
        <p>
          {providerName ??
            (booking.provider_id
              ? "Care professional assigned — view visit for details"
              : booking.status === "Cancelled"
                ? "This visit has been cancelled"
                : "Your care team will arrange a provider")}
        </p>
        <div className="visit-meta">
          <span>
            <Clock3 size={14} />
            {dateTime(booking.starts_at, timezone)}
          </span>
          <span>
            <MapPin size={14} />
            {booking.area}
          </span>
        </div>
      </div>
      <div className="visit-end">
        <strong>{money(booking.price_minor, booking.currency)}</strong>
        <span>
          View visit <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}
