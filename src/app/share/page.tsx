"use client";
import { useEffect, useState } from "react";
import { ReportView } from "@/components/report-view";
import type { Report } from "@/modules/care/types";
export default function SharedReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const token = window.location.hash.slice(1);
    if (!/^[a-f0-9]{64}$/.test(token)) {
      queueMicrotask(() => setError("This sharing link is unavailable."));
      return;
    }
    fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            "This link has expired, was revoked, or is unavailable.",
          );
        return r.json();
      })
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((e) => {
        if (active) setError(e.message ?? "The report could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="page-shell">
      <div className="page-title">
        <p className="eyebrow">SHARED WITH YOU</p>
        <h1>A window into their care.</h1>
        <p>
          This report was shared through a private, time-limited link. Please
          respect the patient’s privacy.
        </p>
      </div>
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : report ? (
        <ReportView report={report} />
      ) : (
        <div
          role="status"
          className="loading-skeleton"
          aria-label="Loading shared report"
        />
      )}
    </main>
  );
}
