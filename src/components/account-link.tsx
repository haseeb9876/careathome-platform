"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  previewAccountLink,
  acceptAdminInvitation,
  confirmEmailChange,
} from "@/modules/accounts/security-actions";
import { PasswordField, SecurityForm } from "./security-form";

export function AccountLink({ kind }: { kind: "email" | "admin" }) {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<{
    email?: string;
    error?: string;
  } | null>(null);
  const [existing, setExisting] = useState(false);
  useEffect(() => {
    let alive = true;
    const value = location.hash.slice(1);
    previewAccountLink(value)
      .then((result) => {
        if (!alive) return;
        setToken(value);
        setPreview(
          result.kind === kind
            ? result
            : { error: result.error ?? "This link is for a different action." },
        );
      })
      .catch(() => {
        if (alive)
          setPreview({
            error: "Unable to check this link. Reopen it and try again.",
          });
      });
    return () => {
      alive = false;
    };
  }, [kind]);
  if (!preview)
    return (
      <p role="status" className="notice">
        Checking your secure link…
      </p>
    );
  if (preview.error)
    return (
      <div className="stack">
        <p role="alert" className="notice error">
          {preview.error}
        </p>
        <Link className="primary-link" href="/dashboard/settings">
          Back to account settings
        </Link>
      </div>
    );
  return (
    <div className="stack">
      <p className="notice">
        {kind === "email" ? "New login email" : "Invited administrator"}:{" "}
        <strong>{preview.email}</strong>
      </p>
      {kind === "admin" && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={existing}
            onChange={(event) => setExisting(event.target.checked)}
          />
          I already started creating this invited account
        </label>
      )}
      {(kind === "email" || existing) && (
        <p className="hint">
          Sign in to your {kind === "email" ? "current" : "invited"} account
          before confirming.{" "}
          <Link
            className="text-link"
            href="/auth"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open sign-in in another tab
          </Link>
          , then return here.
        </p>
      )}
      <SecurityForm
        key={`${kind}-${existing}`}
        action={kind === "email" ? confirmEmailChange : acceptAdminInvitation}
        label={
          kind === "email"
            ? "Verify email and sign out"
            : "Accept administrator invitation"
        }
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="existing" value={String(existing)} />
        {kind === "admin" && !existing ? (
          <>
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <PasswordField
              name="new_password"
              label="New password"
              newPassword
            />
            <PasswordField
              name="confirm_password"
              label="Confirm new password"
              newPassword
            />
            <p className="hint">
              Create your own password using 12–128 characters. After signing
              in, set up two-step verification before inviting other
              administrators.
            </p>
          </>
        ) : (
          <PasswordField />
        )}
      </SecurityForm>
    </div>
  );
}
