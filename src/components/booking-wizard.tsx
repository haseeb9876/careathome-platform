"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { requestBooking } from "@/modules/bookings/actions";
import { SubmitButton } from "./submit-button";
import { money } from "@/lib/utils";
import type { Service } from "@/modules/care/types";
export function BookingWizard({
  services,
  requestKey,
  address,
  area,
  selected,
  preferred,
  timezone,
}: {
  services: Service[];
  requestKey: string;
  address: string;
  area: string;
  selected?: string;
  preferred?: string;
  timezone: string;
}) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(selected ?? services[0]?.id ?? "");
  const [start, setStart] = useState("");
  const [location, setLocation] = useState({ address, area });
  const item = services.find((s) => s.id === service);
  return (
    <div className="surface">
      <div className="step-indicator">
        {["Choose care", "Plan your visit", "Review request"].map((s, i) => (
          <span className={step === i + 1 ? "active" : ""} key={s}>
            <b>{i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      <form action={requestBooking}>
        <input type="hidden" name="requestKey" value={requestKey} />
        <input type="hidden" name="preferred" value={preferred ?? ""} />
        <div hidden={step !== 1} className="stack">
          {services.map((s) => (
            <label className="choice-card" key={s.id}>
              <input
                type="radio"
                name="service"
                value={s.id}
                checked={service === s.id}
                onChange={() => setService(s.id)}
              />
              <div>
                <strong>{s.name}</strong>
                <p>{s.description}</p>
                <small>
                  {s.duration_minutes} minutes ·{" "}
                  {money(s.price_minor, s.currency)}
                </small>
              </div>
            </label>
          ))}
        </div>
        <div hidden={step !== 2}>
          <div className="form-stack">
            <label>
              Date and time · {timezone}
              <input
                name="start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required={step === 2}
              />
            </label>
            <label>
              Service area
              <input
                name="area"
                value={location.area}
                onChange={(e) =>
                  setLocation({ ...location, area: e.target.value })
                }
                minLength={2}
                maxLength={100}
                required={step === 2}
                placeholder="e.g. University Town, Peshawar"
              />
            </label>
            <label>
              Visit address
              <textarea
                name="address"
                value={location.address}
                onChange={(e) =>
                  setLocation({ ...location, address: e.target.value })
                }
                minLength={5}
                maxLength={500}
                required={step === 2}
                rows={3}
              />
            </label>
            <small>
              Choose a visit within the next 180 days. Availability is checked
              before your care team confirms it.
            </small>
          </div>
        </div>
        {step === 3 && (
          <div>
            <h2 className="mb-5">A final look at your request</h2>
            <dl className="detail-list">
              <div>
                <dt>Care service</dt>
                <dd>{item?.name}</dd>
              </div>
              <div>
                <dt>Requested time</dt>
                <dd>
                  {start.replace("T", " · ")}
                  <small className="block">{timezone}</small>
                </dd>
              </div>
              <div>
                <dt>Visit location</dt>
                <dd>
                  {location.address}
                  <br />
                  {location.area}
                </dd>
              </div>
              <div>
                <dt>Visit price</dt>
                <dd>{item && money(item.price_minor, item.currency)}</dd>
              </div>
            </dl>
            <p className="notice">
              <ShieldCheck size={16} className="inline mr-2" />
              Your request will be reviewed and assigned to an eligible
              professional. No real payment is collected.
            </p>
          </div>
        )}
        <div className="toolbar mt-5">
          {step > 1 && (
            <button
              type="button"
              className="secondary-link"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              className="primary-link"
              disabled={!item}
              onClick={(e) => {
                const form = e.currentTarget.form;
                if (
                  step === 2 &&
                  (!form?.reportValidity() ||
                    !start ||
                    location.area.trim().length < 2 ||
                    location.address.trim().length < 5)
                )
                  return;
                setStep(step + 1);
              }}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <SubmitButton>Send visit request</SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
