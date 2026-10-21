import { types } from "pg";
export type DatabaseEnvironment = Record<string, string | undefined>;

/** Validate without including connection strings or passwords in errors. */
export function applicationDatabaseConfig(
  env: DatabaseEnvironment,
  role: "careathome_app" | "careathome_auth" = "careathome_app",
) {
  const value = env.DATABASE_URL;
  if (!value) throw new Error("Neon application database is not configured.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid application database configuration.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname.endsWith(".neon.tech") ||
    !url.password ||
    url.pathname.length < 2 ||
    url.hash
  ) {
    throw new Error("Use a Neon PostgreSQL application connection.");
  }
  if (decodeURIComponent(url.username) !== role) {
    throw new Error(
      "The application requires its restricted careathome_app database role.",
    );
  }
  // node-postgres URL SSL options can override the explicit TLS configuration.
  // Accept only the strict mode, remove it, then set verified TLS below.
  for (const key of url.searchParams.keys()) {
    if (key !== "sslmode" && key !== "channel_binding") {
      throw new Error("Unsupported database connection option.");
    }
  }
  if (
    url.searchParams.has("sslmode") &&
    url.searchParams.get("sslmode") !== "verify-full"
  ) {
    throw new Error("Use sslmode=verify-full for the application connection.");
  }
  if (
    url.searchParams.has("channel_binding") &&
    url.searchParams.get("channel_binding") !== "require"
  ) {
    throw new Error(
      "Database channel binding must be required when specified.",
    );
  }
  const enableChannelBinding =
    url.searchParams.get("channel_binding") === "require";
  const poolMax = Number(env.DATABASE_POOL_MAX ?? 2);
  if (!Number.isInteger(poolMax) || poolMax < 1 || poolMax > 5)
    throw new Error("DATABASE_POOL_MAX must be an integer from 1 to 5.");
  if (env.VERCEL && !url.hostname.includes("-pooler."))
    throw new Error("Hosted runtime connections must use the Neon pooler.");
  url.search = "";
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true as const },
    enableChannelBinding,
    max: poolMax,
    maxLifetimeSeconds: 300,
    query_timeout: 15_000,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    application_name: "careathome",
    types: {
      getTypeParser(oid: number, format?: "text" | "binary") {
        if (format !== "binary" && (oid === 20 || oid === 1700))
          return (value: string) => {
            const number = Number(value);
            if (
              !Number.isFinite(number) ||
              Math.abs(number) > Number.MAX_SAFE_INTEGER
            )
              throw new Error("Database number exceeds application precision.");
            return number;
          };
        return types.getTypeParser(oid, format as "text");
      },
    },
  };
}
