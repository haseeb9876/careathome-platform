import { PageHeading, Panel } from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import type { SectionProps } from "./types";

export async function AuditSection({ account }: SectionProps) {
  const { client } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

  const { data, error } = await client
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeading
        title="Every important change, accounted for."
        description="The latest 200 recorded administrative and care events. Audit entries cannot be edited through the application."
      />
      <Panel>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Related record</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((x) => (
                <tr key={x.id}>
                  <td>{dateTime(x.created_at, tz)}</td>
                  <td>{x.action.replaceAll("_", " ")}</td>
                  <td>{x.actor?.slice(0, 8) ?? "System"}</td>
                  <td>{x.target?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && (
            <p className="notice error">
              Audit data could not be loaded. Verify administrator MFA if
              required.
            </p>
          )}
        </div>
      </Panel>
    </>
  );
}
