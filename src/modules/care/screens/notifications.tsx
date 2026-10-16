import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeading, Panel, Empty, ActionForm } from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import type { SectionProps } from "./types";

export async function NotificationsSection({ account }: SectionProps) {
  const { client, profile } = account;
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";

  const { data } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });
  return (
    <>
      <PageHeading
        title="The little things, kept in the loop."
        description="Visit updates and reminders, without clinical details in notifications."
      />
      <Panel>
        {data?.length ? (
          data.map((n) => (
            <article className="activity-item" key={n.id}>
              <i />
              <div className="flex-1">
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <small>
                  {dateTime(n.created_at, tz)} · {n.read_at ? "Read" : "Unread"}
                </small>
                {n.booking_id && (
                  <Link
                    href={"/dashboard/bookings/" + n.booking_id}
                    className="text-link mt-3"
                  >
                    View visit <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>
              {!n.read_at && (
                <ActionForm
                  op="read"
                  fields={{ p_id: n.id }}
                  label="Mark read"
                  variant="ghost"
                />
              )}
            </article>
          ))
        ) : (
          <Empty
            title="You’re all caught up"
            description="Updates and visit reminders will appear here."
          />
        )}
      </Panel>
    </>
  );
}
