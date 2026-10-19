// Generates a local-only development inbox. Never serve this file from public/.
import { Pool } from "pg";
import { createDecipheriv } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
const url = new URL(
  process.env.DATABASE_MIGRATION_URL ?? "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Unexpected development inbox target");
url.search = "";
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
});
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
try {
  const rows = (
    await pool.query(
      "select recipient,payload_encrypted,created_at from private.development_email order by created_at desc limit 50",
    )
  ).rows;
  const items = rows.map((row) => {
    const data = Buffer.from(row.payload_encrypted, "base64"),
      decipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(process.env.BETTER_AUTH_SECRET.slice(0, 64), "hex"),
        data.subarray(0, 12),
      );
    decipher.setAuthTag(data.subarray(12, 28));
    const message = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
    const link = message.url ? new URL(message.url) : null;
    if (
      link &&
      ![
        "http://127.0.0.1:3000",
        "https://careathome-platform.vercel.app",
      ].includes(link.origin)
    )
      throw new Error("Unexpected inbox link");
    return `<article><small>${escape(row.recipient)} · ${escape(row.created_at.toISOString())}</small><h2>${escape(message.subject)}</h2><p>${escape(message.text ?? "")}</p>${link ? `<a href="${escape(link.toString())}">Open in CareAtHome</a>` : ""}</article>`;
  });
  mkdirSync(".tools", { recursive: true });
  writeFileSync(
    ".tools/development-inbox.html",
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>CareAtHome development inbox</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:50px auto;background:#f5f7f2;color:#173f36}article{background:white;padding:24px;border:1px solid #dce5d6;border-radius:16px;margin:20px 0}small{color:#526a5c}a{color:#17624e}p{white-space:pre-wrap}</style><h1>Development inbox</h1><p>Local synthetic messages only. Recovery links are private. This file is ignored by Git.</p>${items.join("")}</html>`,
  );
  console.log(
    "Local inbox saved to ignored .tools/development-inbox.html. Recovery tokens are not printed.",
  );
} finally {
  await pool.end();
}
