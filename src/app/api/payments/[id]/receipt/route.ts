export const maxDuration = 60;
import { db } from "@/lib/database/server";
import { createPdf, escapeHtml } from "@/lib/pdf";
import { money } from "@/lib/utils";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  if (!z.uuid().safeParse(id).success)
    return new Response("Not found", { status: 404 });
  const { data: p } = await client
    .from("payments")
    .select("*")
    .eq("id", id)
    .single();
  if (!p) return new Response("Not found", { status: 404 });
  try {
    const pdf = await createPdf(
      `<h1>Payment simulation receipt</h1><aside>LOCAL DEMONSTRATION · No real funds charged or refunded.</aside><p>Reference: ${escapeHtml(p.reference)}</p><p>Status: ${escapeHtml(p.status)}</p><p>Amount: ${escapeHtml(money(p.amount_minor, p.currency))}</p><p>Method: ${escapeHtml(p.method)}</p><p>Recorded: ${escapeHtml(p.created_at)}</p><p>Booking: ${escapeHtml(p.booking_id)}</p>`,
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="simulation-receipt.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Local PDF export is temporarily unavailable", {
      status: 503,
    });
  }
}
