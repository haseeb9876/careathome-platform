import { androidAssetLinks } from "@/lib/android-links";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    return Response.json(androidAssetLinks(process.env), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return Response.json([], {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
