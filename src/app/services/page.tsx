import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { db, configured } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";
export default async function Services({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  let services: {
    id: string;
    name: string;
    category: string;
    description: string;
    duration_minutes: number;
    price_minor: number;
    currency: string;
  }[] = [];
  let unavailable = !configured();
  if (configured()) {
    const client = await db();
    let query = client
      .from("services")
      .select("*")
      .eq("active", true)
      .order("name");
    if (category === "nurse" || category === "physiotherapist")
      query = query.eq("category", category);
    const { data, error } = await query;
    services = data ?? [];
    unavailable = Boolean(error);
  }
  return (
    <main className="page-shell">
      <div className="page-title">
        <p className="eyebrow">CARE THAT FITS YOUR EVERYDAY</p>
        <h1>A little support, at home.</h1>
        <p>
          Review the visit details before making a request. All prices are
          synthetic demonstration values.
        </p>
      </div>
      <div className="filter-row" aria-label="Service categories">
        <Link aria-current={!category} href="/services">
          All care
        </Link>
        <Link
          aria-current={category === "nurse"}
          href="/services?category=nurse"
        >
          Home nursing
        </Link>
        <Link
          aria-current={category === "physiotherapist"}
          href="/services?category=physiotherapist"
        >
          Physiotherapy
        </Link>
      </div>
      {unavailable ? (
        <div className="panel">
          <h2>Local catalogue is unavailable</h2>
          <p className="muted">
            Start the local Supabase services and apply the migrations and
            synthetic seed data to explore care.
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className="panel empty">
          <h2>No services in this category yet</h2>
          <p>
            Try another category or return once an administrator adds a service.
          </p>
        </div>
      ) : (
        <div className="service-list">
          {services.map((s) => (
            <article className="panel" key={s.id}>
              <p className="eyebrow">
                {s.category === "nurse" ? "HOME NURSING" : "PHYSIOTHERAPY"}
              </p>
              <h2>{s.name}</h2>
              <p>{s.description}</p>
              <div className="service-meta">
                <span className="flex items-center gap-2">
                  <Clock3 size={17} />
                  {s.duration_minutes} minutes
                </span>
                <strong>{money(s.price_minor, s.currency)}</strong>
              </div>
              <Button asChild>
                <Link href={"/dashboard/new?service=" + s.id}>
                  Request this visit <ArrowUpRight size={17} />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
      <p className="notice">
        A request is not a confirmed appointment. Provider assignment and
        eligibility must be checked before confirmation.
      </p>
    </main>
  );
}
