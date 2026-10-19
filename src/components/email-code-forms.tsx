"use client";
import { EmailOtp } from "./email-otp";
import { SecurityForm, PasswordField } from "./security-form";
import {
  verifySessionEmail,
  recoverWithOtp,
} from "@/modules/accounts/otp-actions";
export function SessionEmailForm() {
  return (
    <SecurityForm action={verifySessionEmail} label="Verify and continue">
      <EmailOtp purpose="login" />
      <label className="check-label">
        <input name="remember" type="checkbox" />
        Remember this private device for 30 days
      </label>
      <p className="hint">
        Leave this unchecked on a shared device. Security changes still require
        a fresh code.
      </p>
    </SecurityForm>
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
