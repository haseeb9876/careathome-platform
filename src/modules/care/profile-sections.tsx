import Link from "next/link";
import {
  PageHeading,
  Panel,
  Badge,
  ActionForm,
  Empty,
} from "@/components/care-ui";
import { SubmitButton } from "@/components/submit-button";
import { MfaPanel } from "@/components/mfa-panel";
import { CredentialUpload } from "@/components/credential-upload";
import { updateProfile } from "@/modules/bookings/actions";
import { requireAccount } from "@/modules/accounts/session";
import { dateTime, localInput } from "@/lib/format";
type Account = Awaited<ReturnType<typeof requireAccount>>;
export async function ProfileSections({
  section,
  account,
}: {
  section: string;
  account: Account;
}) {
  const { client, profile } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";
  if (section === "profile") {
    if (profile.role === "patient") {
      const { data } = await client
        .from("patient_profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      return (
        <>
          <PageHeading
            title="Care starts with knowing you."
            description="Keep your name and usual visit location up to date."
          />
          <div className="detail-grid">
            <Panel title="Your personal details">
              <form action={updateProfile}>
                <label>
                  Full name
                  <input
                    name="name"
                    defaultValue={profile.name}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>
                <label>
                  Usual service area
                  <input
                    name="area"
                    defaultValue={data?.area}
                    maxLength={100}
                  />
                </label>
                <label>
                  Usual address
                  <textarea
                    name="address"
                    defaultValue={data?.address}
                    maxLength={500}
                  />
                </label>
                <SubmitButton>Save profile</SubmitButton>
              </form>
            </Panel>
            <Panel title="Your space stays yours">
              <p className="muted text-sm">
                Your address and care information are private. Your assigned
                professional sees the information needed for your visit.
              </p>
              <Link className="text-link mt-5" href="/dashboard/settings">
                Manage account security â†’
              </Link>
            </Panel>
          </div>
        </>
      );
    }
    const [p, c, s, ps, contact, h] = await Promise.all([
      client
        .from("provider_profiles")
        .select("*")
        .eq("id", profile.id)
        .single(),
      client.from("credentials").select("*").eq("provider_id", profile.id),
      client.from("services").select("*").eq("active", true),
      client
        .from("provider_services")
        .select("service_id")
        .eq("provider_id", profile.id),
      client
        .from("provider_contacts")
        .select("phone")
        .eq("provider_id", profile.id)
        .single(),
      client
        .from("verification_history")
        .select("*")
        .eq("provider_id", profile.id)
        .order("created_at", { ascending: false }),
    ]);
    const provider = p.data;
    return (
      <>
        <PageHeading
          title="Let your expertise speak."
          description="Your profile, credentials, and service areas help us coordinate suitable visits."
        />
        <div className="detail-grid">
          <Panel title="Professional profile">
            <div className="mb-5">
              <Badge status={provider?.verification ?? "Pending"} />
              <p className="security-note">
                Changes to a verified profile require a new review and move
                future confirmed visits to reassignment.
              </p>
            </div>
            <ActionForm op="provider" label="Save and submit for review">
              <label>
                Public name
                <input
                  name="p_name"
                  defaultValue={provider?.public_name || profile.name}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <div className="form-row">
                <label>
                  Years of experience
                  <input
                    name="p_experience"
                    type="number"
                    min={0}
                    max={70}
                    defaultValue={provider?.experience_years ?? 0}
                    required
                  />
                </label>
                <label>
                  Private contact number
                  <input
                    name="p_phone"
                    defaultValue={contact.data?.phone ?? ""}
                    type="tel"
                    minLength={7}
                    maxLength={25}
                    required
                  />
                </label>
              </div>
              <label>
                Qualifications
                <textarea
                  name="p_qualifications"
                  defaultValue={provider?.qualifications}
                  minLength={3}
                  maxLength={2000}
                  required
                />
              </label>
              <label>
                Specialisation
                <input
                  name="p_specialisation"
                  defaultValue={provider?.specialisation}
                  maxLength={200}
                />
              </label>
              <label>
                About your approach
                <textarea
                  name="p_bio"
                  defaultValue={provider?.bio}
                  maxLength={2000}
                  rows={4}
                />
              </label>
              <label>
                Service areas, separated by commas
                <input
                  name="p_areas"
                  defaultValue={provider?.areas?.join(", ")}
                  maxLength={2000}
                  required
                />
              </label>
              <fieldset>
                <legend className="text-xs mb-3 font-semibold">
                  Services you offer · {provider?.profession}
                </legend>
                <div className="stack">
                  {s.data
                    ?.filter((x) => x.category === provider?.profession)
                    .map((x) => (
                      <label className="check-label" key={x.id}>
                        <input
                          type="checkbox"
                          name="p_services"
                          value={x.id}
                          defaultChecked={ps.data?.some(
                            (v) => v.service_id === x.id,
                          )}
                        />
                        {x.name}
                      </label>
                    ))}
                </div>
              </fieldset>
            </ActionForm>
          </Panel>
          <div className="stack">
            <Panel title="Credential documents">
              <p className="muted text-xs mb-5">
                Private documents are visible only to you and authorised
                administrators.
              </p>
              <CredentialUpload />
              {c.data?.map((d) => (
                <div className="activity-item" key={d.id}>
                  <div>
                    <strong>{d.label}</strong>
                    <p>
                      Expires {d.expires_on} ·{" "}
                      {d.reviewed_at ? "Reviewed" : "Awaiting review"}
                    </p>
                    <a className="text-link" href={"/api/credentials/" + d.id}>
                      Open private document â†’
                    </a>
                  </div>
                </div>
              ))}
            </Panel>
            <Panel title="Verification history">
              {h.data?.map((x) => (
                <div className="activity-item" key={x.id}>
                  <i />
                  <div>
                    <Badge status={x.status} />
                    <p>{x.reason}</p>
                    <small>{dateTime(x.created_at, tz)}</small>
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      </>
    );
  }
  if (section === "schedule") {
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
  if (section === "settings")
    return (
      <>
        <PageHeading
          title="Your preferences. Your peace of mind."
          description="Manage account security and the rules that guide your care workspace."
        />
        <div className="grid-2">
          <Panel title="Two-step account security">
            <MfaPanel />
            <p className="security-note">
              Use an authenticator app to protect your account with a one-time
              verification code.
            </p>
            <Link className="text-link" href="/auth/password">
              Change your password â†’
            </Link>
          </Panel>
          {profile.role === "admin" ? (
            <Panel title="Care coordination settings">
              <ActionForm op="settings" label="Save settings">
                <label>
                  Display timezone
                  <select name="p_timezone" defaultValue={config?.timezone}>
                    {["Asia/Karachi", "UTC", "Asia/Dubai"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Default currency
                  <input
                    name="p_currency"
                    defaultValue={config?.currency}
                    pattern="[A-Z]{3}"
                    maxLength={3}
                    required
                  />
                </label>
                <div className="form-row">
                  <label>
                    Travel buffer, minutes
                    <input
                      name="p_buffer"
                      type="number"
                      min={0}
                      max={180}
                      defaultValue={config?.travel_buffer_minutes}
                      required
                    />
                  </label>
                  <label>
                    Cancellation cutoff, hours
                    <input
                      name="p_cutoff"
                      type="number"
                      min={0}
                      max={168}
                      defaultValue={config?.cancellation_cutoff_hours}
                      required
                    />
                  </label>
                </div>
                <label className="check-label">
                  <input
                    name="p_expiry"
                    type="checkbox"
                    defaultChecked={config?.enforce_credential_expiry}
                  />
                  Require current credentials for assignment
                </label>
                <label className="check-label">
                  <input
                    name="p_mfa"
                    type="checkbox"
                    defaultChecked={config?.require_admin_mfa}
                  />
                  Require administrator two-step verification
                </label>
                <small>
                  Verify your authenticator first before enforcing administrator
                  MFA. Existing booking prices remain unchanged.
                </small>
              </ActionForm>
            </Panel>
          ) : (
            <Panel title="Your current care settings">
              <dl className="detail-list">
                <div>
                  <dt>Timezone</dt>
                  <dd>{tz}</dd>
                </div>
                <div>
                  <dt>Cancellation notice</dt>
                  <dd>{config?.cancellation_cutoff_hours} hours</dd>
                </div>
                <div>
                  <dt>Travel buffer</dt>
                  <dd>{config?.travel_buffer_minutes} minutes</dd>
                </div>
              </dl>
              <p className="security-note">
                For changes within the cancellation cutoff, contact your care
                team through support.
              </p>
            </Panel>
          )}
        </div>
      </>
    );
  return null;
}
