"use client";
import { useEffect, useId, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { sendSecurityOtp } from "@/modules/accounts/otp-actions";
import type { OtpPurpose } from "@/modules/accounts/otp";

export function EmailOtp({ purpose }: { purpose: OtpPurpose }) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [state, setState] = useState<{
    id?: string;
    message?: string;
    error?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const form = root.current?.closest("form");
    const changed = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (
        target.name &&
        ![
          "otp_code",
          "remember",
          "current_password",
          "password",
          "confirm_password",
        ].includes(target.name)
      ) {
        setState((current) =>
          current.id
            ? {
                message: "Details changed. Request a new code for this action.",
              }
            : current,
        );
      }
    };
    form?.addEventListener("input", changed);
    return () => form?.removeEventListener("input", changed);
  }, []);
  async function send() {
    const form = root.current?.closest("form");
    if (!form) return;
    for (const element of Array.from(form.elements)) {
      if (
        (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) &&
        element.name !== "otp_code" &&
        !element.checkValidity()
      ) {
        element.reportValidity();
        return;
      }
    }
    setBusy(true);
    try {
      const result = await sendSecurityOtp(purpose, new FormData(form));
      setState(result);
      if (result.id) {
        setSeconds(60);
        if (input.current) input.current.value = "";
        input.current?.focus();
      }
    } catch {
      setState({
        error: "Unable to send a code. Check your connection and retry.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={root} className="email-otp" aria-busy={busy}>
      <div className="email-otp-heading">
        <MailCheck size={20} aria-hidden="true" />
        <strong>Email verification</strong>
      </div>
      <p className="hint">
        Request a code after entering the details above. It expires in five
        minutes and approves this action once.
      </p>
      <button
        type="button"
        className="secondary-link"
        onClick={send}
        disabled={busy || seconds > 0}
      >
        {busy
          ? "Sending…"
          : seconds > 0
            ? `Resend in ${seconds}s`
            : state.id
              ? "Send a new code"
              : "Send verification code"}
      </button>
      <input type="hidden" name="otp_id" value={state.id ?? ""} />
      <label htmlFor={labelId}>Six-digit email code</label>
      <input
        ref={input}
        id={labelId}
        name="otp_code"
        className="otp-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        minLength={6}
        maxLength={6}
        required
        aria-describedby={`${labelId}-help`}
      />
      <small id={`${labelId}-help`}>
        Check your inbox and spam folder. Never share this code.
      </small>
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
    </div>
  );
}
