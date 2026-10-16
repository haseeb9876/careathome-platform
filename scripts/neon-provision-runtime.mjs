import { readFile, appendFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";

const file = new URL("../.env.neon", import.meta.url);
const existing = await readFile(file, "utf8");
if (/^DATABASE_URL=/m.test(existing))
  throw new Error(
    "Runtime roles already configured; refusing password rotation.",
  );
const url = new URL(
  process.env.DATABASE_MIGRATION_URL || "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Unexpected development target.");
url.search = "";
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  let values = "";
  for (const [role, key] of [
    ["careathome_app", "DATABASE_URL"],
    ["careathome_auth", "AUTH_DATABASE_URL"],
    ["careathome_worker", "WORKER_DATABASE_URL"],
  ]) {
    const password = randomBytes(32).toString("hex");
    // Both identifiers and hex-only passwords are generated from fixed local inputs.
    await client.query(`alter role ${role} login password '${password}'`);
    const connection = new URL(url);
    connection.username = role;
    connection.password = password;
    connection.hostname = connection.hostname.replace(
      "ep-long-sunset-b3s9l8hr.",
      "ep-long-sunset-b3s9l8hr-pooler.",
    );
    connection.searchParams.set("sslmode", "verify-full");
    connection.searchParams.set("channel_binding", "require");
    values += `${key}=${connection}\n`;
  }
  values += `BETTER_AUTH_SECRET=${randomBytes(48).toString("hex")}\nAPP_ORIGIN=http://127.0.0.1:3000\n`;
  // Persist credentials before committing; a file error rolls back the role changes.
  await appendFile(file, values);
  await client.query("COMMIT");
  console.log(
    "Restricted runtime role credentials saved in ignored .env.neon.",
  );
} catch {
  await client.query("ROLLBACK");
  console.error(
    "Runtime provisioning failed; inspect the ignored configuration before retrying.",
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
