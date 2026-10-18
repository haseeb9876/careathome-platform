import "server-only";
import { headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import {
  authenticationPool,
  getAuth,
  verifiedSession,
} from "@/lib/database/auth-server";
import { canDeliverAccountEmail, sendAccountMail } from "./email";

export function tokenHash(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new Error("Link is invalid, expired or already used");
  return createHash("sha256").update(token).digest("hex");
}
export async function securitySession(password?: string, admin = false) {
  const session = await verifiedSession();
  if (!session) throw new Error("Sign in again to continue");
  await authenticationPool().query("select private.security_actor($1,$2,$3)", [
    session.session.id,
    admin,
    password !== undefined,
  ]);
  if (password !== undefined) {
    if (!password || password.length > 128)
      throw new Error("Check your current password and try again");
    try {
      await getAuth().api.verifyPassword({
        headers: await headers(),
        body: { password },
      });
    } catch {
      throw new Error(
        "Check your current password, or wait a minute before retrying",
      );
    }
  }
  return session;
}
export async function requestAccountLink(
  kind: "email" | "admin",
  email: string,
  password: string,
) {
  const session = await securitySession(password, kind === "admin");
  if (!canDeliverAccountEmail(email))
    throw new Error("Email delivery is not configured for real addresses");
  const token = randomBytes(32).toString("hex");
  const pool = authenticationPool();
  const result = await pool.query(
    "select private.account_link_create($1,$2,$3,$4) as id",
    [session.session.id, kind, email, tokenHash(token)],
  );
  const id: string = result.rows[0].id;
  const url = `${process.env.APP_ORIGIN ?? "http://127.0.0.1:3000"}/auth/${kind === "email" ? "email-change" : "invitation"}#${token}`;
  try {
    await sendAccountMail(pool, {
      to: email,
      subject:
        kind === "email"
          ? "Verify your new CareAtHome email"
          : "Your CareAtHome administrator invitation",
      text:
        kind === "email"
          ? "Confirm your new email within 30 minutes. Your current login remains unchanged until you confirm. If you did not request this, ignore this message."
          : "You have been invited to manage CareAtHome. This invitation expires in 24 hours and can be used once. Create your own password; the sender will never see it.",
      url,
    });
    await pool.query("select private.account_link_delivery($1,true)", [id]);
  } catch {
    await pool.query("select private.account_link_delivery($1,false)", [id]);
    throw new Error("Email delivery failed. Try again later");
  }
  return email.endsWith(".test")
    ? "Recorded in the private demonstration inbox. No external email was sent."
    : "Email sent. Check your inbox and spam folder.";
}

export type AccountLinkRow = {
  id: string;
  email: string;
  created_at: Date;
  expires_at: Date;
  status: string;
};
export type AccountSessionRow = {
  id: string;
  agent: string;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
  is_current: boolean;
};
export async function accountLinks(kind: "email" | "admin") {
  const session = await securitySession(undefined, kind === "admin");
  return (
    await authenticationPool().query<AccountLinkRow>(
      "select * from private.account_links_list($1,$2)",
      [session.session.id, kind],
    )
  ).rows;
}
export async function accountSessions() {
  const session = await securitySession();
  return (
    await authenticationPool().query<AccountSessionRow>(
      "select * from private.account_sessions_list($1)",
      [session.session.id],
    )
  ).rows;
}
export function securityError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const allowed = [
    "Sign in again to continue",
    "Check your current password and try again",
    "Check your current password, or wait a minute before retrying",
    "Verify two-step security before continuing",
    "Not permitted",
    "Too many requests. Try again later",
    "Use a different email address",
    "Link is invalid, expired or already used",
    "Invitation is no longer available",
    "Use a separate new administrator account",
    "Email delivery is not configured for real addresses",
    "Email delivery failed. Try again later",
  ];
  return allowed.includes(message)
    ? message
    : "Unable to complete this change. Check the details and try again.";
}
