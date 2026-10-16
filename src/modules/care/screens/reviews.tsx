import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import {
  PageHeading,
  Panel,
  Empty,
  Badge,
  ActionForm,
} from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import type { SectionProps } from "./types";

export async function ReviewsSection({ account }: SectionProps) {
  const { client, profile } = account;
  const admin = profile.role === "admin";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

  const { data } = await client
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  return (
    <>
      <PageHeading
        title="A little feedback goes a long way."
        description={
          admin
            ? "Moderate reviews with a recorded reason. Original feedback is retained."
            : "Reviews are connected to completed visits, so feedback comes from a real care journey."
        }
      />
      <div className="grid-2">
        {data?.length ? (
          data.map((r) => (
            <Panel key={r.id}>
              <div className="flex justify-between gap-4">
                <span
                  className="flex gap-1 text-amber-600"
                  aria-label={r.rating + " out of 5 stars"}
                >
                  {Array.from({ length: r.rating }, (_, i) => (
                    <Star key={i} size={15} fill="currentColor" />
                  ))}
                </span>
                <Badge status={r.visible ? "Visible" : "Hidden"} />
              </div>
              <p className="text-sm mt-5 mb-4">
                {r.comment || "Rating without a written comment."}
              </p>
              <small>{dateTime(r.created_at, tz)}</small>
              <Link
                href={"/dashboard/bookings/" + r.booking_id}
                className="text-link mt-4"
              >
                Related visit <ArrowUpRight size={14} />
              </Link>
              {admin && (
                <details className="mt-5">
                  <summary>Moderate this review</summary>
                  <ActionForm
                    op="moderate"
                    fields={{
                      p_review: r.id,
                      p_visible: r.visible ? "false" : "true",
                    }}
                    label={r.visible ? "Hide review" : "Restore review"}
                  >
                    <label>
                      Moderation reason
                      <input
                        name="p_reason"
                        minLength={3}
                        maxLength={500}
                        required
                      />
                    </label>
                  </ActionForm>
                </details>
              )}
            </Panel>
          ))
        ) : (
          <Panel>
            <Empty
              title="Your experience matters"
              description="After a visit is completed, open its details to leave your rating and review."
              href="/dashboard/bookings"
              label="View visits"
            />
          </Panel>
        )}
      </div>
    </>
  );
}
