import { db } from "@/lib/supabase/server";
import { z } from "zod";
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
    .from("credentials")
    .select("object_path")
    .eq("id", id)
    .single();
  if (!data) return new Response("Not found", { status: 404 });
  const { data: file, error } = await client.storage
    .from("credentials")
    .download(data.object_path);
  if (error || !file)
    return new Response("Document unavailable", { status: 404 });
  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition":
        'attachment; filename="credential.' +
        (file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":file.type==="image/jpeg"?"jpg":"bin") +
        '"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
