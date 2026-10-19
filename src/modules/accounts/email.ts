import "server-only";
import type { Pool } from "pg";
import { createCipheriv, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

export function accountEmailMode() {
  if (
    process.env.EMAIL_DELIVERY === "gmail" &&
    process.env.GMAIL_USER &&
    process.env.GMAIL_APP_PASSWORD
  )
    return "gmail";
  return process.env.EMAIL_DELIVERY === "resend" &&
    process.env.RESEND_API_KEY &&
    process.env.EMAIL_FROM
    ? "resend"
    : "development";
}
export function canDeliverAccountEmail(email: string) {
  return (
    email.toLowerCase().endsWith(".test") ||
    accountEmailMode() !== "development"
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
  if (accountEmailMode() === "development")
    throw new Error("Email delivery is not configured for real addresses");
  if (accountEmailMode() === "gmail") {
    const budget = await pool.query("select private.reserve_gmail_delivery() as allowed");
    if(!budget.rows[0]?.allowed) throw new Error("Email delivery failed. Try again later");
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, ""),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const escape = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]!,
      );
    try {
      await transport.sendMail({
        from: { name: "CareAtHome Security", address: process.env.GMAIL_USER! },
        to: mail.to,
        subject: mail.subject,
        text: `${mail.text}\n${mail.url ?? ""}\n\nCareAtHome account security. Never share verification codes.`,
        html: `<div style="background:#f3f7f5;padding:28px;font-family:Arial,sans-serif;color:#163d32"><div style="max-width:520px;margin:auto;background:white;padding:28px;border-radius:16px"><h2>CareAtHome</h2><h3>${escape(mail.subject)}</h3><p style="white-space:pre-line;line-height:1.7">${escape(mail.text)}</p>${mail.url ? `<p><a href="${escape(mail.url)}">Continue securely</a></p>` : ""}<hr><p>Never share your code or password. If you did not request this action, do not approve it.</p></div></div>`,
      });
    } catch {
      throw new Error("Email delivery failed. Try again later");
    } finally {
      transport.close();
    }
    return;
  }
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
