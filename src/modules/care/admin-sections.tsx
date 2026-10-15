import Link from "next/link";
import {
  PageHeading,
  Panel,
  Badge,
  ActionForm,
  Avatar,
  Empty,
} from "@/components/care-ui";
import { requireAccount } from "@/modules/accounts/session";
import { dateTime } from "@/lib/format";
import { money } from "@/lib/utils";
import type { Service } from "./types";
type Account = Awaited<ReturnType<typeof requireAccount>>;
function ServiceForm({ service }: { service?: Service }) {
  return (
    <ActionForm
      op="service"
      fields={{ p_id: service?.id ?? "" }}
      label={service ? "Save service" : "Create service"}
    >
      <label>
        Service name
        <input
          name="p_name"
          defaultValue={service?.name}
          minLength={3}
          maxLength={100}
          required
        />
      </label>
      <label>
        Profession
        <select name="p_category" defaultValue={service?.category}>
          <option value="nurse">Nursing</option>
          <option value="physiotherapist">Physiotherapy</option>
        </select>
      </label>
      <label>
        Description
        <textarea
          name="p_description"
          defaultValue={service?.description}
          minLength={10}
          maxLength={2000}
          required
        />
      </label>
      <div className="form-row">
        <label>
          Duration, minutes
          <input
            name="p_duration"
            type="number"
            min={15}
            max={480}
            defaultValue={service?.duration_minutes ?? 60}
            required
          />
        </label>
        <label>
          Price, minor units (100 = 1 rupee)
          <input
            name="p_price"
            type="number"
            min={0}
            max={100000000}
            defaultValue={service?.price_minor ?? 350000}
            required
          />
        </label>
      </div>
      <label>
        Currency
        <input
          name="p_currency"
          defaultValue={service?.currency ?? "PKR"}
          pattern="[A-Z]{3}"
          required
        />
      </label>
      <label className="check-label">
        <input
          name="p_active"
          type="checkbox"
          defaultChecked={service?.active ?? true}
        />
        Available for new bookings
      </label>
      <small>Existing bookings keep the original price and duration.</small>
    </ActionForm>
  );
}
export async function AdminSections({
  section,
  account,
  query,
}: {
  section: string;
  account: Account;
  query: Record<string, string | undefined>;
}) {
  const { client } = account;
  const { data: config } = await client
    .from("settings")
    .select("timezone")
    .single();
  const tz = config?.timezone ?? "Asia/Karachi";
  if (section === "providers") {
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
                  {p.specialisation} ·{" "}
                  {p.areas?.join(", ") || "No service areas"}
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
  if (section === "users") {
    const { data } = await client
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const people = (data ?? []).filter(
      (p) => !query.q || p.name.toLowerCase().includes(query.q.toLowerCase()),
    );
    return (
      <>
        <PageHeading
          title="The people behind every visit."
          description="Manage account access without exposing private clinical records."
        />
        <form className="search-form mb-6">
          <label>
            Find a person
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Search by name"
            />
          </label>
          <button className="primary-link">Search accounts</button>
        </form>
        <Panel>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account access</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      <small>{p.id.slice(0, 8)}</small>
                    </td>
                    <td>{p.role}</td>
                    <td>
                      <Badge status={p.active ? "Active" : "Inactive"} />
                    </td>
                    <td>
                      {p.role !== "admin" ? (
                        <ActionForm
                          op="account"
                          fields={{
                            p_user: p.id,
                            p_active: p.active ? "false" : "true",
                          }}
                          label={
                            p.active ? "Deactivate account" : "Restore access"
                          }
                          variant="outline"
                        />
                      ) : (
                        <small>Administrator access is protected</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </>
    );
  }
  if (section === "services") {
    const { data } = await client.from("services").select("*").order("name");
    return (
      <>
        <PageHeading
          title="A considered catalogue of care."
          description="Clear descriptions, transparent prices, and services matched to professional qualifications."
        />
        <div className="detail-grid">
          <div className="stack">
            {data?.map((s) => (
              <Panel key={s.id}>
                <div className="panel-heading">
                  <h2>{s.name}</h2>
                  <Badge status={s.active ? "Active" : "Inactive"} />
                </div>
                <p className="muted text-sm">{s.description}</p>
                <p className="text-sm my-4">
                  {s.duration_minutes} minutes ·{" "}
                  {money(s.price_minor, s.currency)}
                </p>
                <details>
                  <summary>Edit service</summary>
                  <ServiceForm service={s} />
                </details>
              </Panel>
            ))}
          </div>
          <Panel title="Add a service">
            <ServiceForm />
          </Panel>
        </div>
      </>
    );
  }
  if (section === "audit") {
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
  return null;
}
