import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PageHeading,
  Panel,
  Empty,
  Badge,
  ActionForm,
} from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import type { SectionProps } from "./types";

export async function SupportSection({ account, query }: SectionProps) {
  const { client, profile } = account;
  const admin = profile.role === "admin";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

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
                title="We’re here when you need a hand"
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
                    {dateTime(b.starts_at, tz)} · {b.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <input name="p_subject" minLength={3} maxLength={150} required />
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
