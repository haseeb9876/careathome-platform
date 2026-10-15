import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileHeart,
  Plus,
  ArrowUpRight,
  Files,
  MessageCircle,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { requireAccount } from "@/modules/accounts/session";
import { PageHeading, Panel, Empty, BookingCard } from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import type { Booking, Service, Settings } from "@/modules/care/types";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const query = await searchParams;
  const { client, profile } = await requireAccount();
  const [b, s, n, r, settings] = await Promise.all([
    client.from("bookings").select("*").order("starts_at"),
    client.from("services").select("*"),
    client
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(4),
    client.from("session_records").select("id", { count: "exact", head: true }),
    client.from("settings").select("*").single(),
  ]);
  const bookings = (b.data ?? []) as Booking[];
  const services = (s.data ?? []) as Service[];
  const config = settings.data as Settings;
  const upcoming = bookings.filter((v) =>
    ["Confirmed", "In Progress"].includes(v.status),
  );
  const pending = bookings.filter((v) =>
    ["Requested", "Pending Assignment", "Reassignment Required"].includes(
      v.status,
    ),
  );
  const patient = profile.role === "patient",
    admin = profile.role === "admin";
  const adminCounts = admin
    ? await Promise.all([
        client.from("profiles").select("id", { count: "exact", head: true }),
        client
          .from("provider_profiles")
          .select("id", { count: "exact", head: true })
          .eq("verification", "Verified"),
        client
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "Cancelled"),
        client
          .from("support_requests")
          .select("id", { count: "exact", head: true })
          .neq("status", "Resolved"),
      ])
    : null;
  const metrics = [
    {
      label: admin ? "Total bookings" : "Upcoming visits",
      value: admin ? bookings.length : upcoming.length,
      icon: CalendarDays,
      note: admin
        ? "Across the care workspace"
        : "Confirmed with your care team",
    },
    {
      label: "Completed visits",
      value: bookings.filter((v) => v.status === "Completed").length,
      icon: CheckCircle2,
      note: "Every visit, a step forward",
    },
    {
      label: admin ? "Needs coordination" : "Awaiting confirmation",
      value: pending.length,
      icon: Clock3,
      note: "Your team is coordinating care",
    },
    {
      label: admin ? "Active services" : "Care records",
      value: admin ? services.filter((s) => s.active).length : (r.count ?? 0),
      icon: admin ? ShieldCheck : FileHeart,
      note: admin
        ? "Available in the catalogue"
        : "Documented and kept together",
    },
  ];
  return (
    <>
      {query.message && (
        <p className="notice" role="status">
          {query.message}
        </p>
      )}
      <PageHeading
        eyebrow={
          admin
            ? "CARE OPERATIONS"
            : patient
              ? "A LITTLE SUPPORT, EVERY STEP"
              : "YOUR PROFESSIONAL WORKSPACE"
        }
        title={"Hello, " + profile.name.split(" ")[0] + "."}
        description={
          admin
            ? "A clear view of your care service, and what needs attention."
            : patient
              ? "Here’s where your care journey stands today."
              : "Make space for thoughtful care. Your visits and records start here."
        }
        action={
          patient ? (
            <Link className="primary-link" href="/dashboard/new">
              <Plus size={16} />
              Book a home visit
            </Link>
          ) : (
            <Link
              className="primary-link"
              href={admin ? "/dashboard/providers" : "/dashboard/schedule"}
            >
              {admin ? "Review professionals" : "Manage availability"}
              <ArrowUpRight size={16} />
            </Link>
          )
        }
      />
      {b.error && (
        <p className="notice error" role="alert">
          We couldn’t load your visits. Refresh to try again.
        </p>
      )}
      <div className="metric-grid">
        {metrics.map((m) => (
          <div className="metric-card" key={m.label}>
            <div className="metric-top">
              <span>{m.label}</span>
              <m.icon />
            </div>
            <strong>{m.value.toString().padStart(2, "0")}</strong>
            <small>{m.note}</small>
          </div>
        ))}
      </div>
      {adminCounts && (
        <div className="metric-grid">
          {[
            "Registered people",
            "Verified professionals",
            "Cancelled visits",
            "Open support conversations",
          ].map((label, i) => (
            <div className="metric-card" key={label}>
              <div className="metric-top">{label}</div>
              <strong>
                {adminCounts[i].error ? "—" : (adminCounts[i].count ?? 0)}
              </strong>
              <small>Live database count</small>
            </div>
          ))}
        </div>
      )}
      <div className="overview-grid">
        <div>
          <div className="welcome-banner">
            <div>
              <p className="eyebrow">CARE, AT YOUR PACE</p>
              <h2>
                {admin
                  ? "Good care starts with good coordination."
                  : patient
                    ? "Your wellbeing deserves a little room."
                    : "Your expertise. Their familiar surroundings."}
              </h2>
              <p>
                {admin
                  ? "Review new requests, verify credentials, and keep every visit moving."
                  : "Visits, notes, and the people supporting you — all thoughtfully connected in one place."}
              </p>
            </div>
            <HeartHandshake />
          </div>
          <Panel
            title={admin ? "Requests needing attention" : "Your next visits"}
            description={config?.timezone ?? "Asia/Karachi"}
          >
            {(admin ? pending : upcoming).length ? (
              (admin ? pending : upcoming)
                .slice(0, 4)
                .map((v) => (
                  <BookingCard
                    key={v.id}
                    booking={v}
                    service={services.find((s) => s.id === v.service_id)}
                    timezone={config?.timezone}
                  />
                ))
            ) : (
              <Empty
                title={
                  patient
                    ? "Your next chapter starts here"
                    : "Your schedule has room"
                }
                description={
                  patient
                    ? "Choose a service and request a visit. We’ll help coordinate the details."
                    : "Confirmed visits will appear here as they are assigned."
                }
                href={patient ? "/services" : "/dashboard/bookings"}
                label={patient ? "Explore care services" : "View all bookings"}
              />
            )}
            <Link className="text-link mt-4" href="/dashboard/bookings">
              View all visits <ArrowUpRight size={14} />
            </Link>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="A little closer to what you need">
            <div className="quick-links">
              {(admin
                ? [
                    [
                      "/dashboard/providers",
                      "Review provider applications",
                      ShieldCheck,
                    ],
                    [
                      "/dashboard/bookings",
                      "Coordinate bookings",
                      CalendarDays,
                    ],
                    [
                      "/dashboard/support",
                      "Resolve support requests",
                      MessageCircle,
                    ],
                  ]
                : patient
                  ? [
                      [
                        "/dashboard/records",
                        "Explore your care timeline",
                        FileHeart,
                      ],
                      ["/dashboard/reports", "Create a care report", Files],
                      [
                        "/dashboard/support",
                        "Ask your care team",
                        MessageCircle,
                      ],
                    ]
                  : [
                      [
                        "/dashboard/profile",
                        "Update your professional profile",
                        ShieldCheck,
                      ],
                      [
                        "/dashboard/records",
                        "Review session records",
                        FileHeart,
                      ],
                      [
                        "/dashboard/schedule",
                        "Set your availability",
                        CalendarDays,
                      ],
                    ]
              ).map(([href, label, Icon]) => {
                const I = Icon as typeof CalendarDays;
                return (
                  <Link key={String(href)} href={String(href)}>
                    <I />
                    {String(label)}
                    <ArrowUpRight />
                  </Link>
                );
              })}
            </div>
          </Panel>
          <Panel title="Latest updates">
            {n.data?.length ? (
              n.data.map((x) => (
                <div className="activity-item" key={x.id}>
                  <i />
                  <div>
                    <strong>{x.title}</strong>
                    <p>{x.body}</p>
                    <small>{dateTime(x.created_at, config?.timezone)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted text-xs">
                You’re all caught up. Updates about your care will appear here.
              </p>
            )}
            <Link href="/dashboard/notifications" className="text-link mt-5">
              All notifications <ArrowUpRight size={14} />
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
