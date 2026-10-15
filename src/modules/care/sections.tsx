import Link from "next/link";
import { Plus, ArrowUpRight, Star } from "lucide-react";
import {
  PageHeading,
  Panel,
  Empty,
  BookingCard,
  Badge,
  ActionForm,
} from "@/components/care-ui";
import { RecordView } from "@/components/record-view";
import { ReportView } from "@/components/report-view";
import { ShareForm } from "@/components/share-form";
import { dateTime, shortDate } from "@/lib/format";
import { money } from "@/lib/utils";
import { requireAccount } from "@/modules/accounts/session";
import type { Booking, Service, RecordEntry, Report } from "./types";
type Account = Awaited<ReturnType<typeof requireAccount>>;
export async function CareSections({
  section,
  account,
  query,
}: {
  section: string;
  account: Account;
  query: Record<string, string | undefined>;
}) {
  const { client, profile } = account;
  const patient = profile.role === "patient",
    admin = profile.role === "admin";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";
  if (section === "bookings") {
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
  if (section === "records") {
    const [r, a] = await Promise.all([
      client
        .from("session_records")
        .select("*")
        .order("visit_at", { ascending: false }),
      client.from("record_amendments").select("*").order("created_at"),
    ]);
    const records = (r.data ?? []) as RecordEntry[];
    const points = records
      .filter((r) => r.mobility_minutes !== null)
      .slice(0, 8)
      .reverse();
    const max = Math.max(...points.map((r) => r.mobility_minutes ?? 0), 1);
    return (
      <>
        <PageHeading
          title="Every step has a story."
          description="Original visit observations, patient-reported experience, and traceable updates."
          action={
            <Link className="primary-link" href="/dashboard/reports">
              Create a report <ArrowUpRight size={16} />
            </Link>
          }
        />
        {patient && points.length > 0 && (
          <Panel
            title="Recorded mobility activity"
            description="Minutes recorded per session Â· Not a clinical outcome score"
            className="mb-6"
          >
            <div
              className="chart-bars"
              role="img"
              aria-label={points
                .map(
                  (r) =>
                    shortDate(r.visit_at, tz) +
                    ": " +
                    r.mobility_minutes +
                    " minutes",
                )
                .join("; ")}
            >
              {points.map((r) => (
                <div key={r.id}>
                  <span>{r.mobility_minutes} min</span>
                  <i
                    style={{
                      height:
                        Math.max(2, ((r.mobility_minutes ?? 0) / max) * 100) +
                        "%",
                    }}
                  />
                  <small>{shortDate(r.visit_at, tz)}</small>
                </div>
              ))}
            </div>
          </Panel>
        )}
        <Panel title="Your care timeline">
          {records.length ? (
            records.map((r) => (
              <div key={r.id}>
                <RecordView
                  record={{
                    ...r,
                    amendments: a.data?.filter((x) => x.record_id === r.id),
                  }}
                  timezone={tz}
                />
                {profile.role === "provider" && (
                  <details className="mb-8">
                    <summary>Add a traceable amendment</summary>
                    <ActionForm
                      op="amend"
                      fields={{ p_record: r.id }}
                      label="Save amendment"
                    >
                      <label>
                        Additional or corrected information
                        <textarea
                          name="p_content"
                          minLength={3}
                          maxLength={10000}
                          required
                        />
                      </label>
                      <label>
                        Reason for this amendment
                        <input
                          name="p_reason"
                          minLength={3}
                          maxLength={500}
                          required
                        />
                      </label>
                      <small>
                        The original entry stays visible. Your name and
                        amendment date are recorded.
                      </small>
                    </ActionForm>
                  </details>
                )}
              </div>
            ))
          ) : (
            <Empty
              title="Your care story starts with a visit"
              description="Completed visits create dated records here, with the professionalâ€™s observations and any later amendments."
              href="/dashboard/bookings"
              label="View visits"
            />
          )}
        </Panel>
      </>
    );
  }
  if (section === "reports") {
    const [r, s, a, records] = await Promise.all([
      client
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false }),
      client
        .from("report_shares")
        .select("id,report_id,expires_at,revoked_at,created_at"),
      client.from("report_access").select("id,share_id,accessed_at"),
      client.from("session_records").select("patient_id,booking_id"),
    ]);
    const reports = (r.data ?? []) as Report[];
    const selected = reports.find((r) => r.id === query.report) ?? reports[0];
    const patients = [
      ...new Set((records.data ?? []).map((r) => r.patient_id as string)),
    ];
    return (
      <>
        <PageHeading
          title="A clearer picture of your care."
          description="Choose a period, review the original records, and decide what to share."
        />
        <div className="detail-grid">
          <div className="stack">
            {selected ? (
              <>
                <div className="toolbar">
                  <Badge status={selected.reviewed_at ? "Reviewed" : "Draft"} />
                  {selected.reviewed_at ? (
                    <a
                      className="primary-link"
                      href={"/api/reports/" + selected.id + "/pdf"}
                    >
                      Download PDF <ArrowUpRight size={16} />
                    </a>
                  ) : (
                    <ActionForm
                      op="report_review"
                      fields={{ p_report: selected.id }}
                      label="I have reviewed these records"
                    />
                  )}
                </div>
                <ReportView report={selected} />
                {patient && selected.reviewed_at && (
                  <Panel title="Share on your terms">
                    <ShareForm report={selected.id} />
                    <div className="stack mt-6">
                      {s.data
                        ?.filter((x) => x.report_id === selected.id)
                        .map((x) => (
                          <div key={x.id} className="surface">
                            <Badge
                              status={
                                x.revoked_at
                                  ? "Revoked"
                                  : new Date(x.expires_at) < new Date()
                                    ? "Expired"
                                    : "Active"
                              }
                            />
                            <p className="muted text-xs mt-3">
                              Expires {dateTime(x.expires_at, tz)} Â·{" "}
                              {a.data?.filter((log) => log.share_id === x.id)
                                .length ?? 0}{" "}
                              access events
                            </p>
                            {!x.revoked_at && (
                              <ActionForm
                                op="revoke"
                                fields={{ p_share: x.id }}
                                label="Revoke access"
                                variant="outline"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </Panel>
                )}
              </>
            ) : (
              <Panel>
                <Empty
                  title="Bring your care story together"
                  description="Create a report from completed visits, then review the source records before downloading or sharing."
                />
              </Panel>
            )}
          </div>
          <div className="stack">
            <Panel title="Create a care report">
              <ActionForm
                op="report"
                fields={patient ? { p_patient: profile.id } : {}}
                label="Generate report"
              >
                {!patient && (
                  <label>
                    Patient
                    <select name="p_patient" required>
                      {patients.map((id) => (
                        <option key={id} value={id}>
                          Patient {id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    <small>
                      Only records from your own visits are included.
                    </small>
                  </label>
                )}
                <label>
                  From
                  <input name="p_from" type="date" required />
                </label>
                <label>
                  Through
                  <input name="p_to" type="date" required />
                </label>
                <small>
                  Up to one year. The summary is generated locally from source
                  records; no external AI is used.
                </small>
              </ActionForm>
            </Panel>
            <Panel title="Saved reports">
              <div className="report-list">
                {reports.map((r) => (
                  <Link href={"/dashboard/reports?report=" + r.id} key={r.id}>
                    {r.title}
                    <small>
                      {r.period_start} â€” {r.period_end}
                    </small>
                  </Link>
                ))}
                {!reports.length && (
                  <p className="muted text-xs">
                    Your generated reports will appear here.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </>
    );
  }
  if (section === "payments") {
    const { data } = await client
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    return (
      <>
        <PageHeading
          title="Clear costs. No surprises."
          description="A separate record of simulated payments, receipts, and refunds."
        />
        <p className="notice">
          Local payment simulation only. No real money is charged and no card
          details are collected. Payment status does not change visit status.
        </p>
        <Panel title="Payment activity">
          {data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Visit</th>
                    {admin && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.reference.slice(0, 16)}
                        <small>{dateTime(p.created_at, tz)}</small>
                      </td>
                      <td>
                        {money(p.amount_minor, p.currency)}
                        <small>{p.method}</small>
                      </td>
                      <td>
                        <Badge status={p.status} />
                      </td>
                      <td>
                        <Link
                          className="text-link"
                          href={"/dashboard/bookings/" + p.booking_id}
                        >
                          View visit <ArrowUpRight size={14} />
                        </Link>
                        <a
                          href={"/api/payments/" + p.id + "/receipt"}
                          className="text-link mt-2"
                        >
                          Download receipt
                        </a>
                      </td>
                      {admin && (
                        <td>
                          {p.status === "Paid" && (
                            <ActionForm
                              op="refund"
                              fields={{ p_payment: p.id }}
                              label="Simulate refund"
                              variant="outline"
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Your payment record is clear"
              description="Open a confirmed visit to try the payment simulation. Receipts will be kept here."
              href="/dashboard/bookings"
              label="View visits"
            />
          )}
        </Panel>
      </>
    );
  }
  if (section === "reviews") {
    const { data } = await client
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    return (
      <>
        <PageHeading
          title="A little feedback goes a long way."
          description={
            admin
              ? "Moderate reviews with a recorded reason. Original feedback is retained."
              : "Reviews are connected to completed visits, so feedback comes from a real care journey."
          }
        />
        <div className="grid-2">
          {data?.length ? (
            data.map((r) => (
              <Panel key={r.id}>
                <div className="flex justify-between gap-4">
                  <span
                    className="flex gap-1 text-amber-600"
                    aria-label={r.rating + " out of 5 stars"}
                  >
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} size={15} fill="currentColor" />
                    ))}
                  </span>
                  <Badge status={r.visible ? "Visible" : "Hidden"} />
                </div>
                <p className="text-sm mt-5 mb-4">
                  {r.comment || "Rating without a written comment."}
                </p>
                <small>{dateTime(r.created_at, tz)}</small>
                <Link
                  href={"/dashboard/bookings/" + r.booking_id}
                  className="text-link mt-4"
                >
                  Related visit <ArrowUpRight size={14} />
                </Link>
                {admin && (
                  <details className="mt-5">
                    <summary>Moderate this review</summary>
                    <ActionForm
                      op="moderate"
                      fields={{
                        p_review: r.id,
                        p_visible: r.visible ? "false" : "true",
                      }}
                      label={r.visible ? "Hide review" : "Restore review"}
                    >
                      <label>
                        Moderation reason
                        <input
                          name="p_reason"
                          minLength={3}
                          maxLength={500}
                          required
                        />
                      </label>
                    </ActionForm>
                  </details>
                )}
              </Panel>
            ))
          ) : (
            <Panel>
              <Empty
                title="Your experience matters"
                description="After a visit is completed, open its details to leave your rating and review."
                href="/dashboard/bookings"
                label="View visits"
              />
            </Panel>
          )}
        </div>
      </>
    );
  }
  if (section === "support") {
    const [s, r, b] = await Promise.all([
      client
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      client.from("support_replies").select("*").order("created_at"),
      client
        .from("bookings")
        .select("id,starts_at")
        .order("starts_at", { ascending: false }),
    ]);
    return (
      <>
        <PageHeading
          title="A real place to ask for help."
          description="Keep questions and responses together, with the visit they relate to."
        />
        <div className="detail-grid">
          <div className="stack">
            {s.data?.length ? (
              s.data.map((t) => (
                <Panel key={t.id}>
                  <div className="panel-heading">
                    <h2>{t.subject}</h2>
                    <Badge status={t.status} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{t.message}</p>
                  <small>{dateTime(t.created_at, tz)}</small>
                  {t.booking_id && (
                    <Link
                      className="text-link mt-3"
                      href={"/dashboard/bookings/" + t.booking_id}
                    >
                      Related visit <ArrowUpRight size={14} />
                    </Link>
                  )}
                  {r.data
                    ?.filter((x) => x.request_id === t.id)
                    .map((x) => (
                      <div className="notice" key={x.id}>
                        <strong>{x.author_name}</strong>
                        <p className="whitespace-pre-wrap">{x.body}</p>
                        <small>{dateTime(x.created_at, tz)}</small>
                      </div>
                    ))}
                  <details className="mt-5">
                    <summary>Reply to this conversation</summary>
                    <ActionForm
                      op="reply"
                      fields={{
                        p_request: t.id,
                        ...(!admin ? { p_status: t.status } : {}),
                      }}
                      label="Send reply"
                    >
                      <label>
                        Your response
                        <textarea
                          name="p_body"
                          minLength={3}
                          maxLength={5000}
                          required
                        />
                      </label>
                      {admin && (
                        <label>
                          Status
                          <select name="p_status" defaultValue={t.status}>
                            {["Open", "In review", "Resolved"].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </ActionForm>
                  </details>
                </Panel>
              ))
            ) : (
              <Panel>
                <Empty
                  title="Weâ€™re here when you need a hand"
                  description="Start a conversation and your care team can respond here."
                />
              </Panel>
            )}
          </div>
          <Panel title="Start a conversation">
            <ActionForm op="support" label="Send to care team">
              <label>
                Related visit
                <select name="p_booking" defaultValue={query.booking ?? ""}>
                  <option value="">General question</option>
                  {b.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {dateTime(b.starts_at, tz)} Â· {b.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Subject
                <input
                  name="p_subject"
                  minLength={3}
                  maxLength={150}
                  required
                />
              </label>
              <label>
                How can we help?
                <textarea
                  name="p_message"
                  rows={5}
                  minLength={5}
                  maxLength={5000}
                  required
                />
              </label>
              <small>This inbox is not monitored for emergencies.</small>
            </ActionForm>
          </Panel>
        </div>
      </>
    );
  }
  if (section === "notifications") {
    const { data } = await client
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    return (
      <>
        <PageHeading
          title="The little things, kept in the loop."
          description="Visit updates and reminders, without clinical details in notifications."
        />
        <Panel>
          {data?.length ? (
            data.map((n) => (
              <article className="activity-item" key={n.id}>
                <i />
                <div className="flex-1">
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <small>
                    {dateTime(n.created_at, tz)} Â·{" "}
                    {n.read_at ? "Read" : "Unread"}
                  </small>
                  {n.booking_id && (
                    <Link
                      href={"/dashboard/bookings/" + n.booking_id}
                      className="text-link mt-3"
                    >
                      View visit <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
                {!n.read_at && (
                  <ActionForm
                    op="read"
                    fields={{ p_id: n.id }}
                    label="Mark read"
                    variant="ghost"
                  />
                )}
              </article>
            ))
          ) : (
            <Empty
              title="Youâ€™re all caught up"
              description="Updates and visit reminders will appear here."
            />
          )}
        </Panel>
      </>
    );
  }
  return null;
}
