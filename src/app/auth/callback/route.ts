import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await db();
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/auth/password", request.url));
  }
  return NextResponse.redirect(
    new URL(
      "/auth?message=Recovery%20link%20is%20invalid%20or%20expired.",
      request.url,
    ),
  );
}
