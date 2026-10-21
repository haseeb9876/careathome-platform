import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PageHeading,
  Panel,
  Empty,
  Badge,
  ActionForm,
} from "@/components/care-ui";
import { dateTime } from "@/lib/format";
import { money } from "@/lib/utils";
import type { SectionProps } from "./types";
import { gatewayColumns } from "@/modules/payments/panel";

export async function PaymentsSection({ account }: SectionProps) {
  const { client, profile } = account;
  const admin = profile.role === "admin";
  const { data: config } = await client.from("settings").select("*").single();
  const tz = config?.timezone ?? "Asia/Karachi";
  const { data: online, error: onlineError } = await client
    .from("gateway_payments")
    .select(gatewayColumns)
    .order("created_at", { ascending: false });

  const { data } = await client
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });
  return (
    <>
      <PageHeading
        title="Clear costs. No surprises."
        description="Your online payment confirmations and separate demonstration receipts."
      />
      <Panel title="Online payments">
        {onlineError ? (
          <p role="alert">
            Online payment history could not be loaded. Please try again.
          </p>
        ) : online?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Visit</th>
                </tr>
              </thead>
              <tbody>
                {online.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.id.slice(0, 8)}
                      <small>
                        {p.environment === "sandbox"
                          ? "Sandbox test"
                          : "Safepay"}
                      </small>
                    </td>
                    <td>
                      {money(p.amount_minor, p.currency)}
                      {p.refunded_minor > 0 && (
                        <small>
                          Refunded {money(p.refunded_minor, p.currency)}
                        </small>
                      )}
                    </td>
                    <td>{p.status}</td>
                    <td>
                      <Link
                        className="text-link"
                        href={"/dashboard/bookings/" + p.booking_id}
                      >
                        View visit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            No online payments yet. When online checkout is activated, verified
            confirmations will appear here.
          </p>
        )}
        <p className="muted mt-3">
          Refunds require support review and provider confirmation. A payment
          notification never changes visit status.
        </p>
      </Panel>
      <p className="notice">
        The demonstration activity below is simulated. No real money is charged
        and no card details are collected. Payment status does not change visit
        status.
      </p>
      <Panel title="Demonstration payment activity">
        {data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Visit</th>
                  {admin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.reference.slice(0, 16)}
                      <small>{dateTime(p.created_at, tz)}</small>
                    </td>
                    <td>
                      {money(p.amount_minor, p.currency)}
                      <small>{p.method}</small>
                    </td>
                    <td>
                      <Badge status={p.status} />
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={"/dashboard/bookings/" + p.booking_id}
                      >
                        View visit <ArrowUpRight size={14} />
                      </Link>
                      <a
                        href={"/api/payments/" + p.id + "/receipt"}
                        className="text-link mt-2"
                      >
                        Download receipt
                      </a>
                    </td>
                    {admin && (
                      <td>
                        {p.status === "Paid" && (
                          <ActionForm
                            op="refund"
                            fields={{ p_payment: p.id }}
                            label="Simulate refund"
                            variant="outline"
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your payment record is clear"
            description="Open a confirmed visit to try the payment simulation. Receipts will be kept here."
            href="/dashboard/bookings"
            label="View visits"
          />
        )}
      </Panel>
    </>
  );
}
