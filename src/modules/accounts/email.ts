import "server-only";
import type { Pool } from "pg";
import { createCipheriv, randomBytes } from "node:crypto";

export function accountEmailMode() {
  return process.env.EMAIL_DELIVERY === "resend" &&
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_FROM
    ? "resend"
    : "development";
}
export function canDeliverAccountEmail(email: string) {
  return (
    email.toLowerCase().endsWith(".test") || accountEmailMode() === "resend"
  );
}
export async function sendAccountMail(
  pool: Pool,
  mail: { to: string; subject: string; text: string; url?: string },
) {
  // Reserved synthetic recipients never leave the encrypted test inbox.
  if (mail.to.toLowerCase().endsWith(".test")) {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret || !/^[a-f0-9]{64,}$/i.test(secret))
      throw new Error("Email service unavailable");
    const nonce = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      Buffer.from(secret.slice(0, 64), "hex"),
      nonce,
    );
    const body = Buffer.concat([
      cipher.update(
        JSON.stringify({
          subject: mail.subject,
          text: mail.text,
          url: mail.url,
        }),
        "utf8",
      ),
      cipher.final(),
    ]);
    await pool.query(
      "insert into private.development_email(recipient,payload_encrypted) values($1,$2)",
      [
        mail.to,
        Buffer.concat([nonce, cipher.getAuthTag(), body]).toString("base64"),
      ],
    );
    return;
  }
  if (accountEmailMode() !== "resend")
    throw new Error("Email delivery is not configured for real addresses");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      text: `${mail.text}${mail.url ? `\n\n${mail.url}` : ""}\n\nCareAtHome · Synthetic demonstration. Never share your password or verification links.`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Email delivery failed. Try again later");
}
