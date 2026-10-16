import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PageHeading,
  Panel,
  Empty,
  Badge,
  ActionForm,
} from "@/components/care-ui";
import { ReportView } from "@/components/report-view";
import { ShareForm } from "@/components/share-form";
import { dateTime } from "@/lib/format";
import type { Report } from "../types";
import type { SectionProps } from "./types";

export async function ReportsSection({ account, query }: SectionProps) {
  const { client, profile } = account;
  const patient = profile.role === "patient";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

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
                            Expires {dateTime(x.expires_at, tz)} ·{" "}
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
                  <small>Only records from your own visits are included.</small>
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
                    {r.period_start} — {r.period_end}
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
