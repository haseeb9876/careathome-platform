import type { RecordEntry } from "@/modules/care/types";
import { dateTime } from "@/lib/format";
export function RecordView({
  record,
  timezone,
}: {
  record: RecordEntry;
  timezone?: string;
}) {
  return (
    <article className="record">
      <small>{dateTime(record.visit_at, timezone)}</small>
      <h3>Visit with {record.author_name}</h3>
      <h4>PROVIDER OBSERVATIONS</h4>
      <p>{record.observations}</p>
      {record.patient_report && (
        <>
          <h4>PATIENT-REPORTED EXPERIENCE</h4>
          <p>{record.patient_report}</p>
        </>
      )}
      {record.notes && (
        <>
          <h4>SESSION NOTES</h4>
          <p>{record.notes}</p>
        </>
      )}
      {record.mobility_minutes !== null &&
        record.mobility_minutes !== undefined && (
          <>
            <h4>RECORDED ACTIVITY</h4>
            <p>{record.mobility_minutes} minutes of mobility activity</p>
          </>
        )}
      {record.amendments?.map((a) => (
        <div className="amendment" key={a.id}>
          <small>
            Amendment · {a.author_name} · {dateTime(a.created_at, timezone)}
          </small>
          <p>{a.content}</p>
          <small>Reason: {a.reason}</small>
        </div>
      ))}
      <small>
        Recorded {dateTime(record.created_at, timezone)} · Original entry
        retained
      </small>
    </article>
  );
}
