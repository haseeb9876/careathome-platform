import { NextResponse } from "next/server";
export async function GET(request: Request) {
  return NextResponse.redirect(
    new URL(
      "/auth?mode=recover&message=Please%20request%20a%20new%20recovery%20link.",
      request.url,
    ),
  );
}
