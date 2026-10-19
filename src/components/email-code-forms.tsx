"use client";
import { useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { EmailOtp } from "./email-otp";
import { SecurityForm, PasswordField } from "./security-form";
import {
  verifySessionEmail,
  recoverWithOtp,
} from "@/modules/accounts/otp-actions";
export function SessionEmailForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await verifySessionEmail({}, form);
      if (result.verified) {
        // Discard prefetched anonymous/pending dashboard routes after assurance changes.
        window.location.replace("/dashboard");
        return;
      }
      setError(result.error ?? "Unable to verify. Please try again.");
    } catch {
      setError("Unable to verify. Check your connection and try again.");
    }
    setPending(false);
  }
  return (
    <form onSubmit={verify} className="form-stack" aria-busy={pending}>
      <EmailOtp purpose="login" autoSend />
      <label className="check-label">
        <input name="remember" type="checkbox" />
        Remember this private device for 30 days
      </label>
      <p className="hint">
        Leave this unchecked on a shared device. Security changes still require
        a fresh code.
      </p>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {pending && (
        <p role="status">
          Verifying your code and opening your care workspace…
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Opening your care workspace…" : "Verify and continue"}
      </Button>
    </form>
  );
}
export function OtpRecoveryForm() {
  return (
    <SecurityForm action={recoverWithOtp} label="Reset password securely">
      <label>
        Email address
        <input
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>
      <PasswordField name="new_password" label="New password" newPassword />
      <PasswordField
        name="confirm_password"
        label="Confirm new password"
        newPassword
      />
      <EmailOtp purpose="recover" />
      <p className="hint">
        Resetting your password signs out existing sessions and remembered
        devices. Your authenticator remains required if enabled.
      </p>
    </SecurityForm>
  );
}
