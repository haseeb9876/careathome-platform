"use client";
import { useActionState, useState } from "react";
import Image from "next/image";
import { mfaAction, manageMfa } from "@/modules/accounts/mfa";
import { EmailOtp } from "./email-otp";
import { PasswordField } from "./security-form";
import { SubmitButton } from "./submit-button";
export function MfaPanel({ enabled = false }: { enabled?: boolean }) {
  const [state, action] = useActionState(
    mfaAction,
    enabled ? { factor: "totp" } : {},
  );
  return (
    <form action={action}>
      <input
        type="hidden"
        name="operation"
        value={state.factor ? "verify" : "enroll"}
      />
      {!state.factor && !state.verified && (
        <label>
          Current password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
      )}
      {state.backupCodes && (
        <div className="notice">
          <p>
            Save these single-use recovery codes somewhere private before
            continuing.
          </p>
          <code>{state.backupCodes.join(" · ")}</code>
        </div>
      )}
      {state.qr && (
        <Image
          unoptimized
          src={state.qr}
          width={190}
          height={190}
          alt="Scan with your authenticator to enrol"
        />
      )}
      {state.factor && (
        <>
          <input name="factor" type="hidden" value={state.factor} />
          <label>
            Six-digit authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
        </>
      )}
      {state.error && (
        <p role="alert" className="notice error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="notice">
          {state.message}
        </p>
      )}
      {!state.verified && (
        <>
          {!state.factor && <EmailOtp purpose="mfa-enroll" />}
          <SubmitButton>
            {state.factor ? "Verify code" : "Set up or verify authenticator"}
          </SubmitButton>
        </>
      )}
    </form>
  );
}

export function MfaMaintenance() {
  const [operation, setOperation] = useState<"backup" | "disable">("backup");
  const [state, action] = useActionState(manageMfa, {});
  return (
    <details className="security-item">
      <summary>Recovery codes and authenticator changes</summary>
      <form action={action} className="form-stack">
        <p className="hint">
          Verify your current authenticator above first. Email codes cannot
          replace authenticator verification.
        </p>
        <label>
          Security action
          <select
            name="operation"
            value={operation}
            onChange={(e) =>
              setOperation(e.target.value as "backup" | "disable")
            }
          >
            <option value="backup">Replace recovery codes</option>
            <option value="disable">
              Disable authenticator (non-admin accounts)
            </option>
          </select>
        </label>
        <PasswordField />
        <EmailOtp
          key={operation}
          purpose={operation === "backup" ? "mfa-backup" : "mfa-disable"}
        />
        {state.error && (
          <p role="alert" className="notice error">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="notice">
            {state.message}
          </p>
        )}
        {state.backupCodes && (
          <div className="notice">
            <p>
              Save privately. These codes will not be shown again here after
              leaving.
            </p>
            <code>{state.backupCodes.join(" · ")}</code>
          </div>
        )}
        <SubmitButton>Confirm security change</SubmitButton>
      </form>
    </details>
  );
}
