import Link from "next/link";
import { Star, ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { db } from "@/lib/supabase/server";
import { Avatar, Empty, Panel } from "@/components/care-ui";
import { money } from "@/lib/utils";
import type { Provider } from "@/modules/care/types";
import { z } from "zod";
export default async function Providers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const client = await db();
  const { data: services } = await client
    .from("services")
    .select("id,name")
    .eq("active", true);
  const { data: settings } = await client
    .from("settings")
    .select("timezone")
    .single();
  const offset =
    settings?.timezone === "UTC"
      ? "Z"
      : settings?.timezone === "Asia/Dubai"
        ? "+04:00"
        : "+05:00";
  const start = p.start ? new Date(p.start + ":00" + offset) : null;
  const { data, error } = await client.rpc("discover_providers", {
    p_profession: p.profession ?? "",
    p_service: z.uuid().safeParse(p.service).success ? p.service : null,
    p_area: p.area ?? "",
    p_specialisation: p.specialisation ?? "",
    p_max_price:
      p.price && Number.isFinite(Number(p.price))
        ? Math.round(Number(p.price) * 100)
        : null,
    p_min_rating: p.rating ? Number(p.rating) : null,
    p_start:
      start && Number.isFinite(start.getTime()) ? start.toISOString() : null,
  });
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
            Maximum price, PKR
            <input
              name="price"
              type="number"
              min={0}
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
      {error ? (
        <p className="notice error">
          The directory could not be loaded. Try adjusting your filters.
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
                      " reviews)"
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
                  (p.services?.[0]?.id ?? "")
                }
              >
                Request this professional <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      )}
      {!error && !data?.length && (
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
