"use client";
import { useActionState } from "react";
import Image from "next/image";
import { mfaAction } from "@/modules/accounts/mfa";
import { SubmitButton } from "./submit-button";
export function MfaPanel() {
  const [state, action] = useActionState(mfaAction, {});
  return (
    <form action={action}>
      <input
        type="hidden"
        name="operation"
        value={state.factor ? "verify" : "enroll"}
      />
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
        <SubmitButton>
          {state.factor ? "Verify code" : "Set up or verify authenticator"}
        </SubmitButton>
      )}
    </form>
  );
}
