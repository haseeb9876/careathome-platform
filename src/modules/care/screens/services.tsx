import { PageHeading, Panel, Badge, ActionForm } from "@/components/care-ui";
import { money } from "@/lib/utils";
import type { Service } from "../types";
import type { SectionProps } from "./types";
function ServiceForm({ service }: { service?: Service }) {
  return (
    <ActionForm
      op="service"
      fields={{ p_id: service?.id ?? "" }}
      label={service ? "Save service" : "Create service"}
    >
      <label>
        Service name
        <input
          name="p_name"
          defaultValue={service?.name}
          minLength={3}
          maxLength={100}
          required
        />
      </label>
      <label>
        Profession
        <select name="p_category" defaultValue={service?.category}>
          <option value="nurse">Nursing</option>
          <option value="physiotherapist">Physiotherapy</option>
        </select>
      </label>
      <label>
        Description
        <textarea
          name="p_description"
          defaultValue={service?.description}
          minLength={10}
          maxLength={2000}
          required
        />
      </label>
      <div className="form-row">
        <label>
          Duration, minutes
          <input
            name="p_duration"
            type="number"
            min={15}
            max={480}
            defaultValue={service?.duration_minutes ?? 60}
            required
          />
        </label>
        <label>
          Price, minor units (100 = 1 rupee)
          <input
            name="p_price"
            type="number"
            min={0}
            max={100000000}
            defaultValue={service?.price_minor ?? 350000}
            required
          />
        </label>
      </div>
      <label>
        Currency
        <input
          name="p_currency"
          defaultValue={service?.currency ?? "PKR"}
          pattern="[A-Z]{3}"
          required
        />
      </label>
      <label className="check-label">
        <input
          name="p_active"
          type="checkbox"
          defaultChecked={service?.active ?? true}
        />
        Available for new bookings
      </label>
      <small>Existing bookings keep the original price and duration.</small>
    </ActionForm>
  );
}
export async function ServicesSection({ account }: SectionProps) {
  const { client } = account;

  const { data } = await client.from("services").select("*").order("name");
  return (
    <>
      <PageHeading
        title="A considered catalogue of care."
        description="Clear descriptions, transparent prices, and services matched to professional qualifications."
      />
      <div className="detail-grid">
        <div className="stack">
          {data?.map((s) => (
            <Panel key={s.id}>
              <div className="panel-heading">
                <h2>{s.name}</h2>
                <Badge status={s.active ? "Active" : "Inactive"} />
              </div>
              <p className="muted text-sm">{s.description}</p>
              <p className="text-sm my-4">
                {s.duration_minutes} minutes ·{" "}
                {money(s.price_minor, s.currency)}
              </p>
              <details>
                <summary>Edit service</summary>
                <ServiceForm service={s as import("../types").Service} />
              </details>
            </Panel>
          ))}
        </div>
        <Panel title="Add a service">
          <ServiceForm />
        </Panel>
      </div>
    </>
  );
}
