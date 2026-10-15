import { db } from "@/lib/supabase/server";
import { createPdf, reportHtml } from "@/lib/pdf";
import { z } from "zod";
import type { Report } from "@/modules/care/types";
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
  const { data } = await client
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) return new Response("Not found", { status: 404 });
  if (!data.reviewed_at)
    return new Response("Review source records before exporting", {
      status: 409,
    });
  try {
    const pdf = await createPdf(reportHtml(data as Report));
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="care-report.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(
      "PDF export is busy or the local Chrome browser is unavailable. Try again.",
      { status: 503 },
    );
  }
}
