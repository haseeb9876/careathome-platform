import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/auth", request.url));
  // Each protected entrypoint additionally validates the actual session and RLS identity.
  return NextResponse.next();
}
export const config = { matcher: ["/dashboard/:path*"] };
