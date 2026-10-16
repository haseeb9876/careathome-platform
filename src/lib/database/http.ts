import { neon } from "@neondatabase/serverless";
import type { applicationDatabaseConfig } from "./config";
import type { DatabaseIdentity } from "./transaction";

/** Server-derived identity and the business query share one atomic HTTPS transaction. */
export function createHttpExecutor(
  config: ReturnType<typeof applicationDatabaseConfig>,
  identity: DatabaseIdentity,
) {
  const url = new URL(config.connectionString);
  if (url.username !== "careathome_app" || !url.hostname.endsWith(".neon.tech"))
    throw new Error("Restricted application connection required.");
  if (
    identity &&
    (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identity.userId,
    ) ||
      !["aal1", "aal2"].includes(identity.assurance))
  )
    throw new Error("Invalid authenticated database identity.");
  const sql = neon(config.connectionString, {
    fullResults: true,
    types: config.types,
  });
  return async (query: string, values: unknown[]) => {
    const result = await sql.transaction(
      [
        sql.query(
          identity ? "SET LOCAL ROLE authenticated" : "SET LOCAL ROLE anon",
        ),
        sql.query(
          "SELECT set_config('request.jwt.claims',$1,true), set_config('statement_timeout','8s',true), set_config('lock_timeout','3s',true)",
          [
            JSON.stringify(
              identity ? { sub: identity.userId, aal: identity.assurance } : {},
            ),
          ],
        ),
        sql.query(query, values, { types: config.types }),
      ],
      {
        fetchOptions: { signal: AbortSignal.timeout(15000), cache: "no-store" },
      },
    );
    return result[2];
  };
}
