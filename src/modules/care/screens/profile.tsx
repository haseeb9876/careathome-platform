import Link from "next/link";
import { PageHeading, Panel, Badge, ActionForm } from "@/components/care-ui";
import { SubmitButton } from "@/components/submit-button";
import { CredentialUpload } from "@/components/credential-upload";
import { updateProfile } from "@/modules/bookings/actions";
import { dateTime } from "@/lib/format";
import type { SectionProps } from "./types";

export async function ProfileSection({ account }: SectionProps) {
  const { client, profile } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

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
                <input name="area" defaultValue={data?.area} maxLength={100} />
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
              Manage account security →
            </Link>
          </Panel>
        </div>
      </>
    );
  }
  const [p, c, s, ps, contact, h] = await Promise.all([
    client.from("provider_profiles").select("*").eq("id", profile.id).single(),
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
              Changes to a verified profile require a new review and move future
              confirmed visits to reassignment.
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
                    Open private document →
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
