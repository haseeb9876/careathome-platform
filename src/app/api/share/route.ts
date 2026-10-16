import { db } from "@/lib/database/server";
import { z } from "zod";
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 1024)
    return new Response("Invalid request", { status: 413 });
  const origin = request.headers.get("origin");
  if (origin && origin !== (process.env.APP_ORIGIN ?? "http://127.0.0.1:3000"))
    return new Response("Not permitted", { status: 403 });
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  const token = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .safeParse(body?.token);
  if (!token.success) return new Response("Link unavailable", { status: 404 });
  const client = await db();
  const { data, error } = await client.rpc("read_shared_report", {
    p_token: token.data,
  });
  if (error || !data)
    return Response.json(
      { error: "This link has expired, was revoked, or is unavailable." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
