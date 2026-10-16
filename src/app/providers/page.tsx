import Link from "next/link";
import { Star, ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { db } from "@/lib/database/server";
import { Avatar, Empty, Panel } from "@/components/care-ui";
import { money } from "@/lib/utils";
import type { Provider } from "@/modules/care/types";
import { z } from "zod";
import { visitInstant } from "@/modules/bookings/validation";
export default async function Providers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const client = await db();
  const { data: services, error: servicesError } = await client
    .from("services")
    .select("id,name")
    .eq("active", true);
  const { data: settings, error: settingsError } = await client
    .from("settings")
    .select("timezone,currency")
    .single();
  const filters = z
    .object({
      profession: z.enum(["", "nurse", "physiotherapist"]).default(""),
      service: z.union([z.literal(""), z.uuid()]).default(""),
      area: z.string().trim().max(100).default(""),
      specialisation: z.string().trim().max(200).default(""),
      price: z
        .string()
        .refine(
          (value) =>
            value === "" ||
            (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 1000000),
        )
        .default(""),
      rating: z.enum(["", "3", "4"]).default(""),
      start: z.string().default(""),
    })
    .safeParse(p);
  const start = p.start
    ? visitInstant(p.start, settings?.timezone ?? "")
    : null;
  const invalid = !filters.success || (!!p.start && !start);
  const unavailable = servicesError || settingsError || !settings;
  const values = filters.success ? filters.data : null;
  const { data, error } =
    !invalid && !unavailable && values
      ? await client.rpc("discover_providers", {
          p_profession: values.profession,
          p_service: values.service || null,
          p_area: values.area,
          p_specialisation: values.specialisation,
          p_max_price: values.price
            ? Math.round(Number(values.price) * 100)
            : null,
          p_min_rating: values.rating ? Number(values.rating) : null,
          p_start: start?.toISOString() ?? null,
        })
      : { data: null, error: null };
  return (
    <main className="page-shell">
      <div className="page-title">
        <p className="eyebrow">EXPERTISE, WITH A HUMAN TOUCH</p>
        <h1>Find your kind of care.</h1>
        <p>
          Explore reviewed professionals, their approach, and the places they
          serve. Your care team confirms availability before a visit is booked.
        </p>
      </div>
      <Panel>
        <form className="search-form">
          <label>
            Service type
            <select name="service" defaultValue={p.service ?? ""}>
              <option value="">All care services</option>
              {services?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Care profession
            <select name="profession" defaultValue={p.profession ?? ""}>
              <option value="">All professionals</option>
              <option value="nurse">Nursing</option>
              <option value="physiotherapist">Physiotherapy</option>
            </select>
          </label>
          <label>
            Service area
            <input
              name="area"
              defaultValue={p.area}
              placeholder="e.g. Peshawar"
              maxLength={100}
            />
          </label>
          <label>
            Specialisation
            <input
              name="specialisation"
              defaultValue={p.specialisation}
              placeholder="e.g. Mobility"
              maxLength={200}
            />
          </label>
          <label>
            Available at · {settings?.timezone}
            <input name="start" type="datetime-local" defaultValue={p.start} />
          </label>
          <label>
            Maximum price, {settings?.currency ?? "PKR"}
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              max={1000000}
              defaultValue={p.price}
              placeholder="Any price"
            />
          </label>
          <label>
            Minimum rating
            <select name="rating" defaultValue={p.rating ?? ""}>
              <option value="">Any rating</option>
              <option value="4">4 stars and above</option>
              <option value="3">3 stars and above</option>
            </select>
          </label>
          <button className="primary-link">
            Find professionals <ArrowUpRight size={16} />
          </button>
          <Link className="text-link" href="/providers">
            Clear filters
          </Link>
        </form>
      </Panel>
      {invalid && (
        <p className="notice error" role="alert">
          Check your filters: use a valid date, a price between 0 and 1,000,000,
          and the available service, profession and rating options.
        </p>
      )}
      {!invalid && !error && !unavailable && (
        <p className="muted mt-6" role="status">
          {data?.length ?? 0} verified{" "}
          {data?.length === 1 ? "professional matches" : "professionals match"}{" "}
          your search.
        </p>
      )}
      {error || unavailable ? (
        <p className="notice error" role="alert">
          The directory is temporarily unavailable. Please try again shortly.
          Your filters are preserved.
        </p>
      ) : (
        <div className="provider-grid">
          {((data as Provider[]) ?? []).map((p) => (
            <article className="surface provider-card" key={p.id}>
              <div className="provider-head">
                <Avatar name={p.public_name} size="large" />
                <div>
                  <span className="status-badge success">
                    <ShieldCheck size={12} />
                    Verified profile
                  </span>
                  <h2>{p.public_name}</h2>
                </div>
              </div>
              <p>
                {p.profession === "nurse" ? "Home nursing" : "Physiotherapy"} ·{" "}
                {p.experience_years} years’ experience
              </p>
              <div className="provider-details">
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {p.areas.join(" · ")}
                </span>
                <span className="flex items-center gap-1">
                  <Star size={13} />
                  {p.rating
                    ? Number(p.rating).toFixed(1) +
                      " (" +
                      p.review_count +
                      (Number(p.review_count) === 1 ? " review)" : " reviews)")
                    : "No reviews yet"}
                </span>
              </div>
              <p>{p.bio || p.specialisation}</p>
              <details>
                <summary>Qualifications & services</summary>
                <p>{p.qualifications}</p>
                {p.services?.map((s) => (
                  <p key={s.id}>
                    {s.name} · {money(s.price_minor, s.currency)} ·{" "}
                    {s.duration_minutes} min
                  </p>
                ))}
              </details>
              {p.demo && <small>Synthetic demonstration profile</small>}
              <Link
                className="primary-link"
                href={
                  "/dashboard/new?provider=" +
                  p.id +
                  "&service=" +
                  (p.services?.find((service) => service.id === values?.service)
                    ?.id ??
                    p.services?.[0]?.id ??
                    "")
                }
              >
                Request this professional <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      )}
      {!invalid && !unavailable && !error && !data?.length && (
        <Panel className="mt-6">
          <Empty
            title="Let’s widen the search"
            description="No verified professionals match these filters yet. Try another area or check back after your care team reviews new applications."
            href="/providers"
            label="Reset filters"
          />
        </Panel>
      )}
    </main>
  );
}
