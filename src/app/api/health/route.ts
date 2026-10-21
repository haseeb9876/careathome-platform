export const dynamic = "force-dynamic";

/** Public liveness only; this does not claim database or email readiness. */
export function GET() {
  return Response.json(
    { status: "ok", service: "careathome", check: "liveness" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
