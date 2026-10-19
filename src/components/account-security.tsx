import Link from "next/link";
import { Panel, Badge } from "./care-ui";
import { PasswordField, SecurityForm } from "./security-form";
import { accountLinks, accountSessions } from "@/modules/accounts/security";
import { accountEmailMode } from "@/modules/accounts/email";
import {
  requestEmailChange,
  inviteAdministrator,
  revokeAccountLink,
  revokeAccountSessions,
  closeOwnAccount,
} from "@/modules/accounts/security-actions";
import { dateTime } from "@/lib/format";

export async function AccountEmailPanel({ email }: { email: string }) {
  const links = await accountLinks("email");
  return (
    <Panel title="Your login email">
      <p className="security-current">
        Current email: <strong>{email}</strong>
      </p>
      <DeliveryNotice />
      <SecurityForm
        action={requestEmailChange}
        label="Send verification email"
        otp="email"
      >
        <label>
          New email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <PasswordField />
        <p className="hint">
          Your current email remains active until you confirm the new address.
          The link expires in 30 minutes; a newer request replaces it.
        </p>
      </SecurityForm>
      <div className="security-list">
        {links
          .filter((link) => link.status === "Pending")
          .map((link) => (
            <div className="security-item" key={link.id}>
              <p>
                Awaiting confirmation: <strong>{link.email}</strong>
              </p>
              <p className="hint">
                Expires {dateTime(link.expires_at.toISOString())}
              </p>
              <details>
                <summary>Cancel this email change</summary>
                <SecurityForm
                  action={revokeAccountLink}
                  label="Cancel email change"
                  otp="revoke-link"
                >
                  <input type="hidden" name="id" value={link.id} />
                  <PasswordField />
                </SecurityForm>
              </details>
            </div>
          ))}
      </div>
    </Panel>
  );
}
export function DeliveryNotice() {
  return accountEmailMode() === "development" ? (
    <p className="notice">
      Account email delivery is in demonstration mode. Real email changes and
      invitations need a configured sender; synthetic .test messages go only to
      the private test inbox.
    </p>
  ) : null;
}
export function CloseAccountPanel() {
  return (
    <Panel title="Close your account">
      <p className="hint">
        Resolve any active bookings first. Closing your account disables access
        and signs out your devices; retained care and audit records are not
        erased.
      </p>
      <details className="security-item">
        <summary>Review account closure</summary>
        <SecurityForm
          action={closeOwnAccount}
          label="Close my account"
          otp="close-account"
        >
          <PasswordField />
          <label className="check-label">
            <input name="confirm_close" type="checkbox" required />I understand
            that my access will be disabled.
          </label>
        </SecurityForm>
      </details>
    </Panel>
  );
}
export async function AdministratorInvitations() {
  const links = await accountLinks("admin");
  return (
    <Panel title="Invite an administrator">
      <p className="security-current">
        Use a new, dedicated email address. Invitations expire after 24 hours
        and can be revoked before acceptance.
      </p>
      <p className="hint">
        Confirm your password and verify two-step security in{" "}
        <Link href="/dashboard/settings" className="text-link">
          Settings & security
        </Link>{" "}
        before inviting someone.
      </p>
      <DeliveryNotice />
      <SecurityForm
        action={inviteAdministrator}
        label="Send administrator invitation"
        otp="admin"
      >
        <label>
          Administrator email
          <input
            type="email"
            name="email"
            autoComplete="off"
            maxLength={254}
            required
          />
        </label>
        <PasswordField />
      </SecurityForm>
      <div className="security-list">
        {links.length === 0 && (
          <p className="muted">No administrator invitations yet.</p>
        )}
        {links.map((link) => (
          <article className="security-item" key={link.id}>
            <div className="security-row">
              <strong>{link.email}</strong>
              <Badge status={link.status} />
            </div>
            <p className="hint">
              Expires {dateTime(link.expires_at.toISOString())}
            </p>
            {link.status === "Pending" && (
              <details>
                <summary>Revoke invitation</summary>
                <SecurityForm
                  action={revokeAccountLink}
                  label="Revoke invitation"
                  otp="revoke-link"
                >
                  <input type="hidden" name="id" value={link.id} />
                  <PasswordField />
                </SecurityForm>
              </details>
            )}
          </article>
        ))}
      </div>
    </Panel>
  );
}
function browserLabel(agent: string) {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const device = /iPhone|iPad/.test(agent)
    ? "Apple mobile"
    : /Android/.test(agent)
      ? "Android"
      : /Windows/.test(agent)
        ? "Windows"
        : /Macintosh/.test(agent)
          ? "Mac"
          : "Other device";
  return `${browser} · ${device}`;
}
export async function AccountSessionsPanel() {
  const sessions = await accountSessions();
  return (
    <Panel title="Where you’re signed in">
      <p className="hint">
        Recognise your active sessions. Browser descriptions are approximate;
        sign out any session you do not recognise.
      </p>
      <div className="security-list">
        {sessions.map((session) => (
          <article className="security-item" key={session.id}>
            <div className="security-row">
              <strong>{browserLabel(session.agent)}</strong>
              {session.is_current && <Badge status="This session" />}
            </div>
            <p className="hint">
              Last renewed {dateTime(session.updated_at.toISOString())}
            </p>
            {!session.is_current && (
              <details>
                <summary>Sign out this session</summary>
                <SecurityForm
                  action={revokeAccountSessions}
                  label="Sign out selected session"
                  otp="sessions"
                >
                  <input type="hidden" name="id" value={session.id} />
                  <PasswordField />
                </SecurityForm>
              </details>
            )}
          </article>
        ))}
      </div>
      {sessions.some((session) => !session.is_current) && (
        <details>
          <summary>Sign out all other sessions</summary>
          <SecurityForm
            action={revokeAccountSessions}
            label="Sign out other sessions"
            otp="sessions"
          >
            <PasswordField />
          </SecurityForm>
        </details>
      )}
    </Panel>
  );
}
