import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeading, Panel, Empty, ActionForm } from "@/components/care-ui";
import { RecordView } from "@/components/record-view";
import { shortDate } from "@/lib/format";
import type { RecordEntry } from "../types";
import type { SectionProps } from "./types";

export async function RecordsSection({ account }: SectionProps) {
  const { client, profile } = account;
  const patient = profile.role === "patient";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

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
          description="Minutes recorded per session · Not a clinical outcome score"
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
                  amendments: a.data?.filter((x) => x.record_id === r.id) as
                    import("../types").Amendment[] | undefined,
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
                      The original entry stays visible. Your name and amendment
                      date are recorded.
                    </small>
                  </ActionForm>
                </details>
              )}
            </div>
          ))
        ) : (
          <Empty
            title="Your care story starts with a visit"
            description="Completed visits create dated records here, with the professional’s observations and any later amendments."
            href="/dashboard/bookings"
            label="View visits"
          />
        )}
      </Panel>
    </>
  );
}
