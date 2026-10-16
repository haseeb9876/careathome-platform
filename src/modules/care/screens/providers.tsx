import Link from "next/link";
import {
  PageHeading,
  Panel,
  Badge,
  ActionForm,
  Avatar,
  Empty,
} from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import type { SectionProps } from "./types";

export async function ProvidersSection({ account, query }: SectionProps) {
  const { client } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

  const [p, c, h] = await Promise.all([
    client
      .from("provider_profiles")
      .select("*")
      .order("created_at", { ascending: false }),
    client.from("credentials").select("*"),
    client
      .from("verification_history")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  const providers = (p.data ?? []).filter(
    (p) => !query.status || p.verification === query.status,
  );
  return (
    <>
      <PageHeading
        title="Trust starts with a careful review."
        description="Check professional details and private credentials before approving care delivery."
      />
      <div className="filter-row">
        {["", "Pending", "Verified", "Rejected", "Suspended"].map((v) => (
          <Link
            key={v}
            aria-current={(query.status ?? "") === v}
            href={"/dashboard/providers" + (v ? "?status=" + v : "")}
          >
            {v || "All professionals"}
          </Link>
        ))}
      </div>
      <div className="grid-2">
        {providers.length ? (
          providers.map((p) => (
            <Panel key={p.id}>
              <div className="provider-head">
                <Avatar name={p.public_name || "New provider"} size="large" />
                <div>
                  <h2>{p.public_name || "New application"}</h2>
                  <p className="muted text-xs">
                    {p.profession} · {p.experience_years} years’ experience
                  </p>
                  <Badge status={p.verification} />
                </div>
              </div>
              <p className="text-sm mt-5">
                {p.qualifications || "Qualifications not submitted."}
              </p>
              <p className="muted text-xs mt-3">
                {p.specialisation} · {p.areas?.join(", ") || "No service areas"}
              </p>
              <p className="muted text-xs mt-3">{p.bio}</p>
              <div className="mt-5">
                <h3 className="text-sm mb-3">Credential documents</h3>
                {c.data
                  ?.filter((c) => c.provider_id === p.id)
                  .map((c) => (
                    <div key={c.id} className="activity-item">
                      <div>
                        <a
                          className="text-link"
                          href={"/api/credentials/" + c.id}
                        >
                          {c.label} ↗
                        </a>
                        <small>
                          Expires {c.expires_on} ·{" "}
                          {c.reviewed_at ? "Reviewed" : "Not yet reviewed"}
                        </small>
                      </div>
                    </div>
                  ))}
                {!c.data?.some((c) => c.provider_id === p.id) && (
                  <p className="muted text-xs">No credentials uploaded.</p>
                )}
              </div>
              {p.verification !== "Rejected" && (
                <details className="mt-5">
                  <summary>Record a verification decision</summary>
                  <ActionForm
                    op="verify"
                    fields={{ p_provider: p.id }}
                    label="Save decision"
                  >
                    <label>
                      Decision
                      <select name="p_status">
                        {p.verification === "Verified" ? (
                          <option>Suspended</option>
                        ) : (
                          <>
                            <option>Verified</option>
                            {p.verification === "Pending" && (
                              <option>Rejected</option>
                            )}
                          </>
                        )}
                      </select>
                    </label>
                    <label>
                      Review reason
                      <textarea
                        name="p_reason"
                        minLength={3}
                        maxLength={500}
                        required
                      />
                    </label>
                    <small>
                      Approval requires current credentials, a completed
                      profile, and an eligible service. Suspending a
                      professional releases future confirmed visits for
                      reassignment.
                    </small>
                  </ActionForm>
                </details>
              )}
              <details className="mt-5">
                <summary>Verification history</summary>
                {h.data
                  ?.filter((x) => x.provider_id === p.id)
                  .map((x) => (
                    <div className="activity-item" key={x.id}>
                      <div>
                        <Badge status={x.status} />
                        <p>{x.reason}</p>
                        <small>{dateTime(x.created_at, tz)}</small>
                      </div>
                    </div>
                  ))}
              </details>
            </Panel>
          ))
        ) : (
          <Panel>
            <Empty
              title="No applications in this view"
              description="Provider applications will appear here for review."
            />
          </Panel>
        )}
      </div>
    </>
  );
}
