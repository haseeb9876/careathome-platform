"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { requestBooking } from "@/modules/bookings/actions";
import { visitTimeError } from "@/modules/bookings/validation";
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
  cancellationHours,
}: {
  services: Service[];
  requestKey: string;
  address: string;
  area: string;
  selected?: string;
  preferred?: string;
  timezone: string;
  cancellationHours: number;
}) {
  const [result, action, pending] = useActionState(requestBooking, {});
  const [timeError, setTimeError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result.error) errorSummary.current?.focus();
  }, [result]);
  const [step, setStep] = useState(1);
  const [service, setService] = useState(
    services.some((s) => s.id === selected)
      ? selected!
      : (services[0]?.id ?? ""),
  );
  const [start, setStart] = useState("");
  const [location, setLocation] = useState({ address, area });
  const item = services.find((s) => s.id === service);
  function goTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className="surface">
      <div className="step-indicator">
        {["Choose care", "Plan your visit", "Review request"].map((s, i) => (
          <span
            aria-current={step === i + 1 ? "step" : undefined}
            className={step === i + 1 ? "active" : ""}
            key={s}
          >
            <b>{i + 1}</b>
            {s}
          </span>
        ))}
      </div>
      <h2 ref={heading} tabIndex={-1} className="mb-5">
        {
          [
            "Choose your care service",
            "Plan your visit",
            "Review your request",
          ][step - 1]
        }
      </h2>
      {result.error && (
        <div
          ref={errorSummary}
          tabIndex={-1}
          role="alert"
          className="notice error"
        >
          <strong>Your request has not been confirmed.</strong>
          <p>{result.error}</p>
          <button className="text-button" type="button" onClick={() => goTo(2)}>
            Check visit details
          </button>
        </div>
      )}
      {!services.length && (
        <p className="notice" role="status">
          There are no services available to book right now. Please contact your
          care team through Support.
        </p>
      )}
      <form action={action} aria-busy={pending}>
        <fieldset disabled={pending} className="booking-fields">
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
              <label htmlFor="visit-start">
                Date and time · {timezone}
                <input
                  id="visit-start"
                  aria-invalid={!!timeError}
                  aria-describedby={
                    timeError ? "visit-time-error" : "visit-time-hint"
                  }
                  name="start"
                  type="datetime-local"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setTimeError(null);
                  }}
                  required={step === 2}
                />
              </label>
              {timeError && (
                <p
                  id="visit-time-error"
                  role="alert"
                  className="feedback error"
                >
                  {timeError}
                </p>
              )}
              <label htmlFor="visit-area">
                Service area
                <input
                  id="visit-area"
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
              <div className="form-field">
                <label htmlFor="visit-address">Visit address</label>
                <textarea
                  id="visit-address"
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
              </div>
              <small id="visit-time-hint">
                Choose a visit within the next 180 days. Availability is checked
                before your care team confirms it.
              </small>
            </div>
          </div>
          {step === 3 && (
            <div>
              <p className="muted mb-5">
                Check these details before sending. You can go back to make
                changes.
              </p>
              <dl className="detail-list">
                <div>
                  <dt>Care service</dt>
                  <dd>
                    {item?.name}
                    <small className="block">
                      {item?.duration_minutes} minutes
                    </small>
                  </dd>
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
              <p className="muted mt-4">
                You can cancel or reschedule up to {cancellationHours} hours
                before the visit. After that, contact your care team for help.
              </p>
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
                onClick={() => goTo(step - 1)}
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
                  if (step === 2) {
                    const error = visitTimeError(start, timezone);
                    setTimeError(error);
                    if (error) {
                      form
                        ?.querySelector<HTMLInputElement>("#visit-start")
                        ?.focus();
                      return;
                    }
                  }
                  goTo(step + 1);
                }}
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <SubmitButton>Send visit request</SubmitButton>
            )}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
