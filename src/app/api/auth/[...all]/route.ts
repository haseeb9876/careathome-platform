import { getAuth } from "@/lib/database/auth-server";
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
  return getAuth().handler(request);
}
export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
