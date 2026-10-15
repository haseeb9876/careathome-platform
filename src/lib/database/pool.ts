import "server-only";
import { Pool } from "pg";
import { applicationDatabaseConfig } from "./config";

const runtime = globalThis as typeof globalThis & { careAtHomePool?: Pool };

/** Never use migration-owner credentials for application reads or writes. */
export function applicationPool() {
  if (!runtime.careAtHomePool) {
    const pool = new Pool(applicationDatabaseConfig(process.env));
    pool.on("error", () => {
      // Driver messages may contain host/user information; keep logs bounded and safe.
      console.error(
        "An idle application database connection closed unexpectedly.",
      );
    });
    runtime.careAtHomePool = pool;
  }
  return runtime.careAtHomePool;
}
