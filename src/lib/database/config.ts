export type DatabaseEnvironment = Record<string, string | undefined>;

/** Validate without including connection strings or passwords in errors. */
export function applicationDatabaseConfig(env: DatabaseEnvironment) {
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
  if (decodeURIComponent(url.username) !== "careathome_app") {
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
  url.search = "";
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true as const },
    enableChannelBinding,
    max: 4,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    application_name: "careathome",
  };
}
