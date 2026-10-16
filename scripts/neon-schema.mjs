import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { authenticationOptions } from "../src/lib/database/auth-options.ts";

// Schema generation only: this command never applies the resulting SQL.
const target = JSON.parse(
  await readFile(new URL("../database/neon-target.json", import.meta.url)),
);
const raw = process.env.DATABASE_MIGRATION_URL;
if (!raw) throw new Error("Missing ignored Neon migration configuration.");
const url = new URL(raw);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/" + target.database
) {
  throw new Error("Connection does not match the approved development target.");
}
url.search = "";
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
  connectionTimeoutMillis: 10000,
});
try {
  const existing = await pool.query(
    "select tablename from pg_tables where schemaname='public'",
  );
  if (existing.rows.length)
    throw new Error(
      "Schema generation requires the fresh development database; existing tables detected.",
    );
  const options = authenticationOptions(
    pool,
    "schema-generation-only-not-a-runtime-secret",
    "http://127.0.0.1:3000",
  );
  const migration = await getMigrations(options);
  const sql = await migration.compileMigrations();
  await mkdir(new URL("../database/migrations/", import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL("../database/migrations/001_identity.sql", import.meta.url),
    "-- Generated from pinned Better Auth configuration. Reviewed and applied by the migration runner.\n" +
      sql +
      "\n",
    { flag: "wx" },
  );
  console.log("Generated identity migration; no database writes performed.");
} finally {
  await pool.end();
}
