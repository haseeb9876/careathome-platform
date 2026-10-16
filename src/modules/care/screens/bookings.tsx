import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeading, Panel, Empty, BookingCard } from "@/components/care-ui";
import type { Booking, Service } from "../types";
import type { SectionProps } from "./types";

export async function BookingsSection({ account, query }: SectionProps) {
  const { client, profile } = account;
  const patient = profile.role === "patient";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

  const [b, s, p] = await Promise.all([
    client
      .from("bookings")
      .select("*")
      .order("starts_at", { ascending: false }),
    client.from("services").select("*"),
    client.from("provider_profiles").select("id,public_name"),
  ]);
  const all = (b.data ?? []) as Booking[];
  const bookings = all.filter(
    (b) => !query.status || b.status === query.status,
  );
  return (
    <>
      <PageHeading
        title={
          patient
            ? "Your visits, thoughtfully arranged."
            : "Every visit. Every next step."
        }
        description="Follow requests, confirmed appointments, and completed care in one place."
        action={
          patient && (
            <Link className="primary-link" href="/dashboard/new">
              <Plus size={16} />
              Book a visit
            </Link>
          )
        }
      />
      <div className="filter-row">
        {[
          "",
          "Requested",
          "Pending Assignment",
          "Confirmed",
          "In Progress",
          "Completed",
          "Cancelled",
          "Reassignment Required",
        ].map((s) => (
          <Link
            key={s}
            aria-current={(query.status ?? "") === s}
            href={
              "/dashboard/bookings" +
              (s ? "?status=" + encodeURIComponent(s) : "")
            }
          >
            {s || "All visits"}{" "}
            <small>
              ({s ? all.filter((b) => b.status === s).length : all.length})
            </small>
          </Link>
        ))}
      </div>
      <Panel>
        {b.error ? (
          <p className="notice error">
            Visits could not be loaded. Please refresh.
          </p>
        ) : bookings.length ? (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              service={(s.data as Service[])?.find(
                (x) => x.id === b.service_id,
              )}
              providerName={
                p.data?.find((x) => x.id === b.provider_id)?.public_name
              }
              timezone={tz}
            />
          ))
        ) : (
          <Empty
            title="A little space in your schedule"
            description="Visits matching this view will appear here."
            href={patient ? "/dashboard/new" : undefined}
            label="Request a visit"
          />
        )}
      </Panel>
    </>
  );
}
