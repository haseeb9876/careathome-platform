"use client";
import { useActionState, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SubmitButton } from "./submit-button";
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
}: {
  action: (state: SecurityState, form: FormData) => Promise<SecurityState>;
  children: React.ReactNode;
  label: string;
  id?: string;
}) {
  const [state, submit] = useActionState(action, {});
  return (
    <form action={submit} id={id} className="form-stack">
      {children}
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
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}
export function ChangePasswordForm() {
  return (
    <SecurityForm
      action={changeOwnPassword}
      label="Change password and sign out"
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
