import { getAuth } from "@/lib/database/auth-server";
import { boundedRequestText, RequestBodyTooLarge } from "@/lib/request-body";
// Sensitive mutations run only through application actions with operation-bound OTP.
const publicRoutes = new Set([
  "get-session",
  "sign-up/email",
  "sign-in/email",
  "sign-out",
  "two-factor/verify-totp",
  "two-factor/verify-backup-code",
]);
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
  if (!publicRoutes.has(path))
    return Response.json(
      { error: "Use the account security screen to verify this operation." },
      { status: 403 },
    );
  if (request.method === "POST") {
    try {
      const body = await boundedRequestText(request, 8192);
      request = new Request(request, { body });
    } catch (error) {
      return Response.json(
        { error: "Invalid request" },
        { status: error instanceof RequestBodyTooLarge ? 413 : 400 },
      );
    }
  }
  const response = await getAuth().handler(request);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
