import type { Report } from "@/modules/care/types";
import { RecordView } from "./record-view";
export function ReportView({ report }: { report: Report }) {
  return (
    <article className="report-paper">
      <header className="report-heading">
        <p className="eyebrow">CAREATHOME · PERSONAL CARE REPORT</p>
        <h2>{report.title}</h2>
        <p>
          {report.period_start} — {report.period_end}
        </p>
        <p>
          {report.reviewed_at
            ? "Reviewed for export"
            : "Draft · Review source records before exporting"}
        </p>
      </header>
      <div className="report-summary">{report.summary}</div>
      <p className="security-note">
        This is a deterministic summary of recorded visits, not a diagnosis or
        medical recommendation. Patient-reported experience is labelled
        separately from provider observations.
      </p>
      {report.source_records.map((r, i) => (
        <RecordView key={r.id ?? i} record={r} />
      ))}
      <small>
        Generated locally · {report.adapter} · Confidential care information
      </small>
    </article>
  );
}
