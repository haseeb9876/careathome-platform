"use client";
import { useActionState, useState } from "react";
import { createShare } from "@/modules/care/actions";
import { SubmitButton } from "@/components/submit-button";
export function ShareForm({ report }: { report: string }) {
  const [state, action] = useActionState(createShare, {});
  const [copied, setCopied] = useState(false);
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="report" value={report} />
      <label>
        Link expires after
        <select name="days">
          <option value="1">24 hours</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
        </select>
      </label>
      <p className="hint">
        Anyone holding this link can read this report until it expires or you
        revoke it. No other records are shared.
      </p>
      <SubmitButton>Create private sharing link</SubmitButton>
      {state.error && (
        <p role="alert" className="feedback error">
          {state.error}
        </p>
      )}
      {state.url && (
        <div className="share-result">
          <label>
            Your private link
            <input readOnly value={state.url} />
          </label>
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              await navigator.clipboard.writeText(state.url!);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </form>
  );
}
