"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { sendSecurityOtp } from "@/modules/accounts/otp-actions";
import type { OtpPurpose } from "@/modules/accounts/otp";

export function EmailOtp({
  purpose,
  autoSend = false,
}: {
  purpose: OtpPurpose;
  autoSend?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const sending = useRef(false);
  const deadline = useRef(0);
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
      () =>
        setSeconds(
          Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
        ),
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
  const send = useCallback(async () => {
    if (sending.current) return;
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
    sending.current = true;
    setBusy(true);
    try {
      const result = await sendSecurityOtp(purpose, new FormData(form));
      setState(result);
      if (result.id) {
        deadline.current =
          autoSend && result.expiresAt
            ? Date.parse(result.expiresAt)
            : Date.now() + 60000;
        setSeconds(
          Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
        );
        if (input.current) input.current.value = "";
        input.current?.focus();
      }
    } catch {
      setState({
        error: "Unable to send a code. Check your connection and retry.",
      });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }, [purpose, autoSend]);
  useEffect(() => {
    if (autoSend && !started.current) {
      started.current = true;
      void send();
    }
  }, [autoSend, send]);
  return (
    <div
      ref={root}
      className="email-otp"
      aria-busy={busy}
      data-auto-send={autoSend || undefined}
    >
      <div className="email-otp-heading">
        <MailCheck size={20} aria-hidden="true" />
        <strong>Email verification</strong>
      </div>
      <p className="hint">
        {autoSend
          ? "We send your sign-in code automatically. Enter it within five minutes. You can request another when it expires."
          : "Request a code after entering the details above. It expires in five minutes and approves this action once."}
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
            ? autoSend
              ? `Code expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
              : `Resend in ${seconds}s`
            : state.id
              ? "Send a new code"
              : "Send verification code"}
      </button>
      {autoSend && state.id && seconds === 0 && !busy && (
        <p role="status" className="notice">
          Your code has expired. Request a new code to continue.
        </p>
      )}
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
