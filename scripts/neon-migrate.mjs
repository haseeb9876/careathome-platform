import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";

const url = new URL(
  process.env.DATABASE_MIGRATION_URL || "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
) {
  throw new Error(
    "Refusing to migrate outside the approved CareAtHome development target.",
  );
}
url.search = "";
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
  connectionTimeoutMillis: 10000,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(7400152026)");
  const exists = await client.query(
    "select to_regclass('public.careathome_migrations') as ledger",
  );
  if (!exists.rows[0].ledger) {
    const existing = await client.query(
      "select tablename from pg_tables where schemaname='public'",
    );
    if (existing.rows.length)
      throw new Error(
        "Unrecognised database contents; refusing initial migration.",
      );
  }
  if (!process.argv.includes("--apply")) {
    console.log(
      "Development target verified. Pass --apply to apply reviewed migrations.",
    );
    await client.query("ROLLBACK");
  } else {
    await client.query(
      "create table if not exists public.careathome_migrations(name text primary key,sha256 text not null,applied_at timestamptz not null default now())",
    );
    await client.query(
      "revoke all on public.careathome_migrations from public",
    );
    await client.query("SET LOCAL search_path=public,extensions");
    const folder = new URL("../database/migrations/", import.meta.url);
    for (const name of (await readdir(folder))
      .filter((n) => /^\d{3}_[a-z_]+\.sql$/.test(n))
      .sort()) {
      const sql = await readFile(new URL(name, folder), "utf8");
      // Git/Windows can convert LF to CRLF without changing SQL. Preserve old
      // ledger hashes, accepting only exact content with either newline encoding.
      const canonicalSql = sql.replace(/\r\n/g, "\n");
      const digest = (value) => createHash("sha256").update(value).digest("hex");
      const hash = digest(canonicalSql);
      const equivalentHashes = new Set([digest(sql), hash, digest(canonicalSql.replace(/\n/g, "\r\n"))]);
      const prior = await client.query(
        "select sha256 from public.careathome_migrations where name=$1",
        [name],
      );
      if (prior.rows.length) {
        if (!equivalentHashes.has(prior.rows[0].sha256))
          throw new Error("Previously applied migration was edited: " + name);
        continue;
      }
      await client.query(sql);
      await client.query(
        "insert into public.careathome_migrations(name,sha256) values($1,$2)",
        [name, hash],
      );
      console.log("Applied " + name);
    }
    await client.query("COMMIT");
    console.log("Development migrations committed.");
  }
} catch (error) {
  await client.query("ROLLBACK");
  // SQL errors can contain clinical values; this target contains synthetic fixtures only.
  console.error("Migration rolled back:", error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
