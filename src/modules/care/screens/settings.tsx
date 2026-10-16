import Link from "next/link";
import { PageHeading, Panel, ActionForm } from "@/components/care-ui";
import { MfaPanel } from "@/components/mfa-panel";
import type { SectionProps } from "./types";

export async function SettingsSection({ account }: SectionProps) {
  const { client, profile } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";
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
            Change your password →
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
              For changes within the cancellation cutoff, contact your care team
              through support.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}
