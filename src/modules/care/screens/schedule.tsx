import { PageHeading, Panel, ActionForm, Empty } from "@/components/care-ui";
import { dateTime, localInput } from "@/lib/format";
import type { SectionProps } from "./types";

export async function ScheduleSection({ account }: SectionProps) {
  const { client, profile } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

  const [a, t, p] = await Promise.all([
    client
      .from("availability")
      .select("*")
      .eq("provider_id", profile.id)
      .order("starts_at"),
    client
      .from("time_off")
      .select("*")
      .eq("provider_id", profile.id)
      .order("starts_at"),
    client
      .from("provider_profiles")
      .select("verification")
      .eq("id", profile.id)
      .single(),
  ]);
  return (
    <>
      <PageHeading
        title="Make space for your best work."
        description={
          "Set the hours you can visit, and protect your time off. All times: " +
          tz
        }
      />
      {p.data?.verification !== "Verified" && (
        <p className="notice">
          Your profile must be verified before availability can be added.
        </p>
      )}
      <div className="grid-2">
        <div className="stack">
          <Panel title="Add available hours">
            <ActionForm
              op="availability"
              fields={{ p_id: "", p_delete: "false" }}
              label="Add availability"
            >
              <div className="form-row">
                <label>
                  From
                  <input name="p_start" type="datetime-local" required />
                </label>
                <label>
                  Until
                  <input name="p_end" type="datetime-local" required />
                </label>
              </div>
              <small>
                Overlapping windows are rejected. Assigned visits also reserve
                the configured travel buffer.
              </small>
            </ActionForm>
          </Panel>
          <Panel title="Your available windows">
            {a.data?.length ? (
              a.data.map((x) => (
                <div className="activity-item" key={x.id}>
                  <div className="flex-1">
                    <strong>{dateTime(x.starts_at, tz)}</strong>
                    <p>Until {dateTime(x.ends_at, tz)}</p>
                    <details className="mt-3">
                      <summary>Edit this window</summary>
                      <ActionForm
                        op="availability"
                        fields={{ p_id: x.id, p_delete: "false" }}
                        label="Update availability"
                      >
                        <label>
                          From
                          <input
                            name="p_start"
                            type="datetime-local"
                            defaultValue={localInput(x.starts_at, tz)}
                            required
                          />
                        </label>
                        <label>
                          Until
                          <input
                            name="p_end"
                            type="datetime-local"
                            defaultValue={localInput(x.ends_at, tz)}
                            required
                          />
                        </label>
                      </ActionForm>
                    </details>
                  </div>
                  <ActionForm
                    op="availability"
                    fields={{
                      p_id: x.id,
                      p_start: x.starts_at,
                      p_end: x.ends_at,
                      p_delete: "true",
                    }}
                    label="Remove"
                    variant="ghost"
                  />
                </div>
              ))
            ) : (
              <Empty
                title="A fresh calendar"
                description="Add your first available window above."
              />
            )}
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Block time off">
            <ActionForm
              op="timeoff"
              fields={{ p_id: "", p_delete: "false" }}
              label="Save time off"
            >
              <div className="form-row">
                <label>
                  From
                  <input name="p_start" type="datetime-local" required />
                </label>
                <label>
                  Until
                  <input name="p_end" type="datetime-local" required />
                </label>
              </div>
              <label>
                Reason
                <input name="p_reason" maxLength={500} />
              </label>
              <small>
                Reassign confirmed visits before blocking their time.
              </small>
            </ActionForm>
          </Panel>
          <Panel title="Protected time">
            {t.data?.length ? (
              t.data.map((x) => (
                <div className="activity-item" key={x.id}>
                  <div className="flex-1">
                    <strong>{dateTime(x.starts_at, tz)}</strong>
                    <p>
                      Until {dateTime(x.ends_at, tz)} · {x.reason}
                    </p>
                  </div>
                  <ActionForm
                    op="timeoff"
                    fields={{
                      p_id: x.id,
                      p_start: x.starts_at,
                      p_end: x.ends_at,
                      p_reason: x.reason ?? "",
                      p_delete: "true",
                    }}
                    label="Remove"
                    variant="ghost"
                  />
                </div>
              ))
            ) : (
              <p className="muted text-xs">No time off added.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
