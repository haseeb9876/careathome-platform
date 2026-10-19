"use server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { authenticationPool, getAuth } from "@/lib/database/auth-server";
import { securitySession, tokenHash } from "./security";
import {
  issueOtp,
  consumeOtp,
  otpContext,
  otpPurposes,
  type OtpPurpose,
  securityNotice,
} from "./otp";
import { otpDigest } from "./otp-crypto";

async function pendingSession() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (
    !session ||
    Date.now() - new Date(session.session.createdAt).getTime() > 86400000
  )
    throw new Error("Sign in again to continue.");
  const active = await authenticationPool().query(
    "select active from public.profiles where id=$1",
    [session.user.id],
  );
  if (!active.rows[0]?.active) throw new Error("Sign in again to continue.");
  return session;
}
function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /^(Enter |Code is |Wait 60|Too many|Email |Sign in again|Check your current|Verify two-step|Not permitted)/.test(
    message,
  )
    ? message
    : "Unable to complete verification. Please try again.";
}
export async function sendSecurityOtp(
  purposeInput: string,
  form: FormData,
): Promise<{
  id?: string;
  expiresAt?: string;
  message?: string;
  error?: string;
}> {
  try {
    if (!Object.hasOwn(otpPurposes, purposeInput))
      throw new Error("Not permitted");
    const purpose = purposeInput as OtpPurpose;
    let email: string,
      actor: string | null,
      sessionId = "",
      deliver = true;
    if (purpose === "recover") {
      email = z.email().parse(
        String(form.get("email") ?? "")
          .trim()
          .toLowerCase(),
      );
      form.set("email", email);
      const user = await authenticationPool().query(
        "select u.id from public.identity_users u join public.profiles p on p.id=u.id where lower(u.email)=$1 and p.active",
        [email],
      );
      actor = user.rows[0]?.id ?? null;
      deliver = Boolean(actor);
    } else if (purpose === "invite-accept" || purpose === "email-confirm") {
      const link = await authenticationPool().query(
        "select * from private.account_link_preview($1)",
        [tokenHash(String(form.get("token") ?? ""))],
      );
      if (
        !link.rows[0] ||
        link.rows[0].kind !== (purpose === "invite-accept" ? "admin" : "email")
      )
        throw new Error(
          "Code is unavailable because the invitation or verification link is invalid.",
        );
      email = link.rows[0].email;
      actor = null;
      if (purpose === "email-confirm") {
        const session = await securitySession(
          String(form.get("current_password") ?? ""),
        );
        actor = session.user.id;
        sessionId = session.session.id;
      }
    } else {
      const session =
        purpose === "login"
          ? await pendingSession()
          : await securitySession(
              String(
                form.get("current_password") ?? form.get("password") ?? "",
              ),
              ["admin", "settings", "account"].includes(purpose),
            );
      email = session.user.email;
      actor = session.user.id;
      sessionId = session.session.id;
    }
    const context = otpContext(purpose, form, sessionId);
    if (purpose === "login") {
      // Refreshing the verification screen must not send or invalidate a code.
      const existing = await authenticationPool().query(
        "select id, expires_at from private.email_challenges where actor=$1 and email=$2 and purpose='login' and context_hash=$3 and delivered_at is not null and consumed_at is null and revoked_at is null and attempts<5 and expires_at>now() order by created_at desc limit 1",
        [actor, email.toLowerCase(), context],
      );
      if (existing.rows[0])
        return {
          id: existing.rows[0].id,
          expiresAt: new Date(existing.rows[0].expires_at).toISOString(),
          message:
            "Your sign-in code has been sent. Check your inbox and enter the code below. If needed, check Spam.",
        };
    }
    return await issueOtp(email, actor, purpose, context, deliver);
  } catch (error) {
    return { error: publicError(error) };
  }
}
export async function verifySessionEmail(
  _state: { error?: string },
  form: FormData,
): Promise<{ error?: string; verified?: boolean }> {
  try {
    const session = await pendingSession();
    await consumeOtp(form, session.user.email, "login", session.session.id);
    const pool = authenticationPool();
    await pool.query(
      'update public.identity_users set "emailVerified"=true where id=$1',
      [session.user.id],
    );
    await pool.query(
      'update public.identity_sessions set "emailOtpVerified"=true where id=$1 and "userId"=$2',
      [session.session.id, session.user.id],
    );
    if (form.get("remember") === "on") {
      const token = randomBytes(32).toString("hex");
      await pool.query(
        "insert into private.trusted_email_devices(token_hash,actor) values($1,$2)",
        [otpDigest(token, process.env.BETTER_AUTH_SECRET!), session.user.id],
      );
      (await cookies()).set("careathome_device", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86400,
      });
    }
    after(() =>
      securityNotice(
        session.user.email,
        "Your email was verified for a new sign-in.",
      ),
    );
  } catch (error) {
    return { error: publicError(error) };
  }
  return { verified: true };
}
export async function recoverWithOtp(
  _state: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  try {
    const email = z.email().parse(
      String(form.get("email") ?? "")
        .trim()
        .toLowerCase(),
    );
    form.set("email", email);
    const password = z
      .string()
      .min(12)
      .max(128)
      .parse(form.get("new_password"));
    if (password !== form.get("confirm_password"))
      throw new Error("Enter matching new passwords.");
    await consumeOtp(form, email, "recover");
    const pool = authenticationPool();
    const user = await pool.query(
      "select u.id from public.identity_users u join public.profiles p on p.id=u.id where lower(u.email)=$1 and p.active",
      [email],
    );
    if (!user.rows[0])
      throw new Error("Code is incorrect, expired or already used.");
    const hash = await (await getAuth().$context).password.hash(password);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        'update public.identity_accounts set password=$1,"updatedAt"=now() where "userId"=$2 and "providerId"=\'credential\'',
        [hash, user.rows[0].id],
      );
      await client.query(
        'delete from public.identity_sessions where "userId"=$1',
        [user.rows[0].id],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    await securityNotice(
      email,
      "Your password was reset. Existing sessions and remembered devices were signed out. Authenticator protection remains enabled if previously configured.",
    );
  } catch (error) {
    return { error: publicError(error) };
  }
  redirect("/auth?message=Password%20reset.%20Sign%20in%20again.");
}
