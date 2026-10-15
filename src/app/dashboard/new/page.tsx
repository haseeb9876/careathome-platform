import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAccount } from "@/modules/accounts/session";
import { PageHeading } from "@/components/care-ui";
import { BookingWizard } from "@/components/booking-wizard";
export default async function NewBooking({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    provider?: string;
    error?: string;
  }>;
}) {
  const { client, profile } = await requireAccount();
  if (profile.role !== "patient") redirect("/dashboard");
  const p = await searchParams;
  const [s, patient, config] = await Promise.all([
    client.from("services").select("*").eq("active", true),
    client.from("patient_profiles").select("*").eq("id", profile.id).single(),
    client.from("settings").select("timezone").single(),
  ]);
  return (
    <>
      <PageHeading
        title="Make room for your care."
        description="A few thoughtful details help us arrange the right visit."
      />
      {p.error && (
        <p className="notice error" role="alert">
          {p.error}
        </p>
      )}
      <div className="detail-grid">
        <BookingWizard
          services={s.data ?? []}
          requestKey={randomUUID()}
          address={patient.data?.address ?? ""}
          area={patient.data?.area ?? ""}
          selected={p.service}
          preferred={p.provider}
          timezone={config.data?.timezone ?? "Asia/Karachi"}
        />
        <aside className="surface">
          <p className="eyebrow">WHAT HAPPENS NEXT</p>
          <h2>You choose. We coordinate.</h2>
          <p className="muted text-sm mt-4">
            Your care team reviews your request, checks professional credentials
            and availability, and confirms your visit.
          </p>
          <p className="notice">
            A requested time is a preference until your visit is confirmed.
          </p>
          <p className="muted text-xs">
            Need something urgent? This service is not for emergencies. Contact
            your local emergency service.
          </p>
        </aside>
      </div>
    </>
  );
}
