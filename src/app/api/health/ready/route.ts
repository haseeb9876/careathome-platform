import { authorizedOperator } from "@/lib/operations";
import { applicationDatabaseConfig } from "@/lib/database/config";
import { createHttpExecutor } from "@/lib/database/http";
import { authenticationPool } from "@/lib/database/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (
    !authorizedOperator(
      request.headers.get("authorization"),
      process.env.OPS_HEALTH_TOKEN,
    )
  )
    return Response.json({ error: "Not authorized" }, { status: 401, headers });
  try {
    const execute = createHttpExecutor(
      applicationDatabaseConfig(process.env),
      null,
    );
    await Promise.all([
      execute("select 1 as ready", []),
      authenticationPool().query("select 1 as ready"),
    ]);
    return Response.json(
      {
        status: "ok",
        checks: ["application_database", "authentication_database"],
      },
      { headers },
    );
  } catch {
    console.error(JSON.stringify({ event: "database_readiness_failed" }));
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
