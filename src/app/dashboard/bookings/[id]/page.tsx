import { bookingStatusGuidance } from "@/modules/bookings/validation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAccount } from "@/modules/accounts/session";
import {
  PageHeading,
  Panel,
  Badge,
  ActionForm,
  Avatar,
} from "@/components/care-ui";
import { RecordView } from "@/components/record-view";
import { dateTime, localInput } from "@/lib/format";
import { money } from "@/lib/utils";
import type { Booking, RecordEntry, Provider } from "@/modules/care/types";
export default async function Visit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const q = await searchParams;
  const { client, profile } = await requireAccount();
  const { data, error } = await client
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  const b = data as Booking;
  const [s, p, h, c, r, a, pay, review, eligible] = await Promise.all([
    client.from("services").select("*").eq("id", b.service_id).single(),
    b.provider_id
      ? client
          .from("provider_profiles")
          .select("*")
          .eq("id", b.provider_id)
          .single()
      : Promise.resolve({ data: null }),
    client
      .from("booking_history")
      .select("*")
      .eq("booking_id", id)
      .order("created_at"),
    client.from("settings").select("*").single(),
    client
      .from("session_records")
      .select("*")
      .eq("booking_id", id)
      .maybeSingle(),
    client.from("record_amendments").select("*").order("created_at"),
    client.from("payments").select("*").eq("booking_id", id).maybeSingle(),
    client.from("reviews").select("id").eq("booking_id", id).maybeSingle(),
    profile.role === "admin"
      ? client.rpc("discover_providers", {
          p_area: b.area,
          p_service: b.service_id,
          p_start: b.starts_at,
        })
      : Promise.resolve({ data: [] }),
  ]);
  const tz = c.data?.timezone ?? "Asia/Karachi";
  const admin = profile.role === "admin",
    patient = profile.role === "patient",
    provider = profile.role === "provider";
  const terminal = ["Completed", "Cancelled"].includes(b.status),
    back = "/dashboard/bookings/" + id;
  return (
    <>
      <Link href="/dashboard/bookings" className="text-link mb-5">
        ← All visits
      </Link>
      <PageHeading
        eyebrow={"VISIT " + id.slice(0, 8).toUpperCase()}
        title={s.data?.name ?? "Your home visit"}
        description={dateTime(b.starts_at, tz) + " · " + tz}
        action={<Badge status={b.status} />}
      />
      <p className="notice">{bookingStatusGuidance(b.status)}</p>
      {q.message && (
        <p className="notice" role="status">
          {q.message}
        </p>
      )}
      {q.error && (
        <p className="notice error" role="alert">
          {q.error}
        </p>
      )}
      <div className="detail-grid">
        <div className="stack">
          <Panel title="The details, all together">
            <dl className="detail-list">
              <div>
                <dt>Scheduled time</dt>
                <dd>{dateTime(b.starts_at, tz)}</dd>
              </div>
              <div>
                <dt>Visit ends</dt>
                <dd>{dateTime(b.ends_at, tz)}</dd>
              </div>
              <div>
                <dt>Visit address</dt>
                <dd>
                  {b.address}
                  <br />
                  {b.area}
                </dd>
              </div>
              <div>
                <dt>Agreed visit price</dt>
                <dd>
                  {money(b.price_minor, b.currency)}
                  <small className="block">
                    Preserved from your original request
                  </small>
                </dd>
              </div>
              <div>
                <dt>Payment status</dt>
                <dd>
                  <Badge status={pay.data?.status ?? "Not simulated"} />
                </dd>
              </div>
            </dl>
          </Panel>
          {p.data && (
            <Panel title="Your care professional">
              <div className="provider-head">
                <Avatar name={p.data.public_name} size="large" />
                <div>
                  <h3>{p.data.public_name}</h3>
                  <p className="muted text-xs">
                    {p.data.profession} · {p.data.specialisation}
                  </p>
                  <Badge status={p.data.verification} />
                </div>
              </div>
            </Panel>
          )}
          {r.data && (
            <Panel title="Visit record">
              <RecordView
                record={
                  {
                    ...r.data,
                    amendments: a.data?.filter(
                      (x) => x.record_id === r.data?.id,
                    ),
                  } as RecordEntry
                }
                timezone={tz}
              />
              <Link className="text-link" href="/dashboard/records">
                Open care timeline →
              </Link>
            </Panel>
          )}
          <Panel title="Your visit journey">
            {h.data?.map((x) => (
              <div className="activity-item" key={x.id}>
                <i />
                <div>
                  <Badge status={x.new_status} />
                  <p>{x.reason}</p>
                  {x.old_start && (
                    <p>
                      Rescheduled from {dateTime(x.old_start, tz)} to{" "}
                      {dateTime(x.new_start, tz)}
                    </p>
                  )}
                  <small>
                    {dateTime(x.created_at, tz)} ·{" "}
                    {x.actor === profile.id ? "You" : "Care team"}
                  </small>
                </div>
              </div>
            ))}
          </Panel>
        </div>
        <div className="stack">
          {admin && b.status === "Requested" && (
            <Panel title="Review this request">
              <p className="muted text-xs mb-5">
                Check the location and requested service, then move the visit to
                the assignment queue.
              </p>
              <ActionForm
                op="queue"
                fields={{ p_booking: id }}
                back={back}
                label="Move to assignment queue"
              />
            </Panel>
          )}
          {admin &&
            ["Pending Assignment", "Reassignment Required"].includes(
              b.status,
            ) && (
              <Panel title="Assign an eligible professional">
                {b.preferred_provider_id && (
                  <p className="notice">
                    Patient preference: {b.preferred_provider_id.slice(0, 8)}.
                    Assign only if eligible and available.
                  </p>
                )}
                {eligible.data?.length ? (
                  <ActionForm
                    op="assign"
                    fields={{ p_booking: id }}
                    back={back}
                    label="Assign and confirm visit"
                  >
                    <label>
                      Available professional
                      <select name="p_provider" required>
                        {(eligible.data as Provider[]).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.public_name}
                            {p.id === b.preferred_provider_id
                              ? " · Patient preference"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assignment note
                      <input
                        name="p_reason"
                        defaultValue="Eligibility and availability reviewed"
                        minLength={3}
                        maxLength={500}
                        required
                      />
                    </label>
                    <small>
                      Credentials, services, area, availability, time off, and
                      travel buffers are rechecked at confirmation.
                    </small>
                  </ActionForm>
                ) : (
                  <p className="notice">
                    No eligible professional is available for this time and
                    area. Review provider availability or reschedule the
                    request.
                  </p>
                )}
              </Panel>
            )}
          {provider && b.status === "Confirmed" && (
            <Panel title="Ready to begin?">
              <p className="muted text-xs mb-4">
                You can start within 30 minutes of the scheduled visit.
              </p>
              <ActionForm
                op="start"
                fields={{ p_booking: id }}
                back={back}
                label="Start this visit"
              />
            </Panel>
          )}
          {provider && b.status === "In Progress" && (
            <Panel title="Complete your session record">
              <ActionForm
                op="complete"
                fields={{ p_booking: id }}
                back={back}
                label="Save record and complete visit"
              >
                <label>
                  Your observations
                  <textarea
                    name="p_observations"
                    rows={4}
                    minLength={3}
                    maxLength={10000}
                    required
                  />
                </label>
                <label>
                  Patient-reported experience
                  <textarea name="p_patient_report" maxLength={10000} />
                </label>
                <label>
                  Session notes
                  <textarea name="p_notes" maxLength={10000} />
                </label>
                <label>
                  Mobility activity, minutes (optional)
                  <input name="p_mobility" type="number" min={0} max={1440} />
                </label>
                <small>
                  Your name and timestamp are recorded. Later changes are made
                  as amendments.
                </small>
              </ActionForm>
            </Panel>
          )}
          {patient &&
            ["Confirmed", "In Progress", "Completed"].includes(b.status) &&
            !pay.data?.status?.match(/Paid|Refunded/) && (
              <Panel title="Try a payment simulation">
                <ActionForm
                  op="pay"
                  fields={{ p_booking: id }}
                  back={back}
                  label="Run simulation"
                >
                  <label>
                    Simulation outcome
                    <select name="p_outcome">
                      <option value="Paid">Successful payment</option>
                      <option value="Failed">Failed payment</option>
                    </select>
                  </label>
                  <small>
                    {money(b.price_minor, b.currency)} · No real charge. No card
                    details.
                  </small>
                </ActionForm>
              </Panel>
            )}
          {patient && b.status === "Completed" && !review.data && (
            <Panel title="How did your visit feel?">
              <ActionForm
                op="review"
                fields={{ p_booking: id }}
                back={back}
                label="Share your review"
              >
                <label>
                  Rating
                  <select name="p_rating">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Your experience
                  <textarea name="p_comment" maxLength={2000} />
                </label>
                <small>
                  One review per completed visit. Please leave private health
                  information out of public feedback.
                </small>
              </ActionForm>
            </Panel>
          )}
          {!terminal && b.status !== "In Progress" && (patient || admin) && (
            <Panel title="Plans can change">
              <details>
                <summary>Reschedule this visit</summary>
                <ActionForm
                  op="reschedule"
                  fields={{ p_booking: id }}
                  back={back}
                  label="Save new time"
                >
                  <label>
                    New time · {tz}
                    <input
                      name="p_start"
                      type="datetime-local"
                      defaultValue={localInput(b.starts_at, tz)}
                      required
                    />
                  </label>
                  <label>
                    Reason
                    <input
                      name="p_reason"
                      minLength={3}
                      maxLength={500}
                      required
                    />
                  </label>
                  <small>
                    Confirmed visits can only move to another eligible slot.
                    Patient changes require {c.data?.cancellation_cutoff_hours}{" "}
                    hours’ notice.
                  </small>
                </ActionForm>
              </details>
              <details className="mt-5">
                <summary>Cancel this visit</summary>
                <ActionForm
                  op="cancel"
                  fields={{ p_booking: id }}
                  back={back}
                  label="Confirm cancellation"
                  variant="outline"
                >
                  <label>
                    Cancellation reason
                    <textarea
                      name="p_reason"
                      minLength={3}
                      maxLength={500}
                      required
                    />
                  </label>
                  <small>
                    This closes the booking. Cancellation requires{" "}
                    {c.data?.cancellation_cutoff_hours} hours’ notice for
                    patients. Contact support if needed.
                  </small>
                </ActionForm>
              </details>
            </Panel>
          )}
          {(provider || admin) && b.status === "Confirmed" && (
            <Panel title="A change in professional availability">
              <details>
                <summary>Request reassignment</summary>
                <ActionForm
                  op="reassign"
                  fields={{ p_booking: id }}
                  back={back}
                  label="Move to reassignment"
                >
                  <label>
                    Reason
                    <textarea
                      name="p_reason"
                      minLength={3}
                      maxLength={500}
                      required
                    />
                  </label>
                  <small>
                    The visit will need a new administrator assignment before it
                    is confirmed again.
                  </small>
                </ActionForm>
              </details>
            </Panel>
          )}
          <Panel title="We’re here to help">
            <p className="muted text-xs mb-4">
              A question about your visit? Keep the conversation connected to
              this booking.
            </p>
            <Link
              className="text-link"
              href={"/dashboard/support?booking=" + id}
            >
              Contact your care team →
            </Link>
            {patient && terminal && (
              <Link
                className="text-link mt-5"
                href={"/dashboard/new?service=" + b.service_id}
              >
                Request another visit →
              </Link>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
