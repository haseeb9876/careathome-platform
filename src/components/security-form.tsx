"use client";
import { startTransition, useActionState, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { EmailOtp } from "./email-otp";
import type { OtpPurpose } from "@/modules/accounts/otp";
import {
  changeOwnPassword,
  type SecurityState,
} from "@/modules/accounts/security-actions";

export function PasswordField({
  name = "current_password",
  label = "Current password",
  newPassword = false,
}: {
  name?: string;
  label?: string;
  newPassword?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={newPassword ? "new-password" : "current-password"}
          minLength={newPassword ? 12 : undefined}
          maxLength={128}
          required
        />
        <button
          type="button"
          className="icon-button"
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
export function SecurityForm({
  action,
  children,
  label,
  id,
  otp,
}: {
  action: (state: SecurityState, form: FormData) => Promise<SecurityState>;
  children: React.ReactNode;
  label: string;
  id?: string;
  otp?: OtpPurpose;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form
      action={submit}
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        startTransition(() => submit(values));
      }}
      id={id}
      className="form-stack"
      aria-busy={pending}
    >
      {children}
      {otp && <EmailOtp purpose={otp} />}
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
      <Button type="submit" disabled={pending}>
        {pending ? "Verifying…" : label}
      </Button>
    </form>
  );
}
export function ChangePasswordForm() {
  return (
    <SecurityForm
      action={changeOwnPassword}
      label="Change password and sign out"
      otp="password"
    >
      <p className="hint">
        Use 12–128 characters. A long, unique passphrase is easier to remember.
        Changing your password signs out all sessions.
      </p>
      <PasswordField />
      <PasswordField name="new_password" label="New password" newPassword />
      <PasswordField
        name="confirm_password"
        label="Confirm new password"
        newPassword
      />
    </SecurityForm>
  );
}
