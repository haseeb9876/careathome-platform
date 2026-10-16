import { Pool } from "pg";
import { createCipheriv, randomBytes } from "node:crypto";
const url = new URL(process.env.WORKER_DATABASE_URL ?? "postgresql://invalid");
if (
  url.hostname !==
    "ep-long-sunset-b3s9l8hr-pooler.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome" ||
  url.username !== "careathome_worker"
)
  throw new Error("Unexpected development worker target");
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || !/^[a-f0-9]{96}$/i.test(secret))
  throw new Error("Development email encryption key is missing");
url.search = "";
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
  connectionTimeoutMillis: 10000,
});
pool.on("error", () => console.error("Idle notification connection closed."));
function encrypt(message) {
  const nonce = randomBytes(12),
    cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(secret.slice(0, 64), "hex"),
      nonce,
    );
  const body = Buffer.concat([
    cipher.update(JSON.stringify(message)),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), body]).toString("base64");
}
async function cycle() {
  const client = await pool.connect();
  let delivered = 0;
  try {
    await client.query(
      "begin; set local role service_role; set local statement_timeout='10s'",
    );
    await client.query("select public.enqueue_reminders()");
    const messages = await client.query("select * from public.claim_emails()");
    for (const message of messages.rows) {
      await client.query(
        "insert into private.development_email(recipient,payload_encrypted,source_id) values($1,$2,$3) on conflict(source_id) do nothing",
        [
          message.email,
          encrypt({
            subject: message.title,
            text: message.body,
            url: "http://127.0.0.1:3000/dashboard",
          }),
          message.id,
        ],
      );
      await client.query("select public.finish_email($1,true)", [message.id]);
      delivered++;
    }
    await client.query("commit");
    console.log(
      `Development inbox: ${delivered} notifications captured; no external email sent.`,
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
try {
  await cycle();
} finally {
  await pool.end();
}
