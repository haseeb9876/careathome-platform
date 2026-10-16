"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  prepareCredential,
  finishCredential,
} from "@/modules/care/credential-actions";

export function CredentialUpload() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const file = data.get("document");
        if (!(file instanceof File)) return;
        setBusy(true);
        setMessage("Preparing your private upload…");
        try {
          const prepared = await prepareCredential({
            type: file.type,
            size: file.size,
          });
          if ("error" in prepared) throw new Error(prepared.error);
          setMessage("Uploading your document securely…");
          const response = await fetch(prepared.url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type, "If-None-Match": "*" },
          });
          if (!response.ok)
            throw new Error(
              "Upload failed. Check your connection and try again.",
            );
          setMessage("Checking your document…");
          const result = await finishCredential({
            path: prepared.path,
            label: String(data.get("label")),
            expiry: String(data.get("expires_on")),
          });
          if (result.error) throw new Error(result.error);
          setMessage("Credential submitted for review.");
          form.reset();
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Upload failed. Please try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Document label
        <input
          name="label"
          placeholder="e.g. Professional registration"
          minLength={3}
          maxLength={100}
          required
          disabled={busy}
        />
      </label>
      <label>
        Expiry date
        <input name="expires_on" type="date" required disabled={busy} />
      </label>
      <label>
        PDF, JPEG or PNG · up to 5 MB
        <input
          name="document"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          required
          disabled={busy}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Upload credential"}
      </Button>
      {message && (
        <p role="status" className="muted text-sm mt-3">
          {message}
        </p>
      )}
    </form>
  );
}
