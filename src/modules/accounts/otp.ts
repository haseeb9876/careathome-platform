import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { authenticationPool } from "@/lib/database/auth-server";
import { newOtp, otpDigest, operationDigest } from "./otp-crypto";
import { canDeliverAccountEmail, sendAccountMail } from "./email";

export const otpPurposes = {
  login: [],
  recover: ["email", "new_password"],
  password: ["new_password"],
  email: ["email"],
  admin: ["email"],
  "email-confirm": ["token"],
  "invite-accept": ["token", "name", "new_password", "existing"],
  "revoke-link": ["id"],
  sessions: ["id"],
  "mfa-enroll": [],
  "mfa-disable": [],
  "mfa-backup": [],
  settings: [
    "p_timezone",
    "p_currency",
    "p_buffer",
    "p_cutoff",
    "p_expiry",
    "p_mfa",
  ],
  account: ["p_user", "p_active"],
  "close-account": [],
} as const;
export type OtpPurpose = keyof typeof otpPurposes;
export function otpContext(
  purpose: OtpPurpose,
  form: FormData,
  sessionId = "",
) {
  const values: Record<string, string> = { session: sessionId };
  for (const key of otpPurposes[purpose])
    values[key] = String(form.get(key) ?? "");
  return operationDigest(purpose, values, process.env.BETTER_AUTH_SECRET!);
}
export async function issueOtp(
  email: string,
  actor: string | null,
  purpose: OtpPurpose,
  context: string,
  deliver = true,
) {
  if (!canDeliverAccountEmail(email))
    throw new Error(
      "Email sending is not configured. Contact your administrator.",
    );
  const pool = authenticationPool();
  await pool.query(
    "with retired as (delete from private.email_challenges where expires_at<now()-interval '7 days') delete from private.trusted_email_devices where expires_at<now()",
  );
  const secret = process.env.BETTER_AUTH_SECRET!;
  const otp = newOtp(secret);
  const requestHeaders = await headers();
  const ip = process.env.VERCEL
    ? (requestHeaders.get("x-vercel-forwarded-for") ?? "unknown")
    : "local";
  const result = await pool.query(
    "select private.issue_email_challenge($1,$2,$3,$4,$5,$6,$7) as status",
    [
      otp.id,
      actor,
      email.toLowerCase(),
      purpose,
      context,
      otp.hash,
      otpDigest(ip, secret),
    ],
  );
  if (result.rows[0].status !== "created")
    throw new Error(
      result.rows[0].status === "cooldown"
        ? "Wait 60 seconds before requesting another code."
        : "Too many requests. Please try again later.",
    );
  const deliverCode = async () => {
    if (!deliver) return;
    try {
      await sendAccountMail(pool, {
        to: email,
        subject: "Your Sukoonara Care security code",
        text: `Your verification code is: ${otp.code}\n\nAction: ${purpose.replaceAll("-", " ")}\nThis code expires in five minutes and works once. A newer code replaces the previous code for this action.`,
      });
      await pool.query(
        "update private.email_challenges set delivered_at=now() where id=$1",
        [otp.id],
      );
    } catch {
      await pool.query(
        "update private.email_challenges set revoked_at=now() where id=$1",
        [otp.id],
      );
      throw new Error("Email could not be sent. Try again later.");
    }
  };
  if (purpose === "recover") {
    // Avoid exposing account existence through SMTP latency or delivery errors.
    after(async () => {
      try {
        await deliverCode();
      } catch {
        console.error("Recovery email delivery failed.");
      }
    });
  } else await deliverCode();
  const expiry = await pool.query(
    "select expires_at from private.email_challenges where id=$1",
    [otp.id],
  );
  return {
    id: otp.id,
    expiresAt: new Date(expiry.rows[0].expires_at).toISOString(),
    message: email.endsWith(".test")
      ? "If eligible, a code will be saved in the private demonstration inbox. No external email is sent."
      : purpose === "login"
        ? "Your sign-in code has been sent. Check your inbox and enter the code below. If needed, check Spam."
        : "If this request is eligible, a code will arrive by email. Check your inbox and spam folder.",
  };
}
export async function consumeOtp(
  form: FormData,
  email: string,
  purpose: OtpPurpose,
  sessionId = "",
) {
  const id = String(form.get("otp_id") ?? "");
  const code = String(form.get("otp_code") ?? "");
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^\d{6}$/.test(code))
    throw new Error("Enter the six-digit email code before continuing.");
  const result = await authenticationPool().query(
    "select private.consume_email_challenge($1,$2,$3,$4,$5) as valid",
    [
      id,
      email.toLowerCase(),
      purpose,
      otpContext(purpose, form, sessionId),
      otpDigest(`${id}:${code}`, process.env.BETTER_AUTH_SECRET!),
    ],
  );
  if (!result.rows[0].valid)
    throw new Error(
      "Code is incorrect, expired or already used. Request a new code if needed.",
    );
}
export async function securityNotice(email: string, action: string) {
  try {
    await sendAccountMail(authenticationPool(), {
      to: email,
      subject: "Sukoonara Care security activity",
      text: `${action}\nIf you did not do this, reset your password and contact your administrator immediately.`,
    });
  } catch {
    console.error("Security notification delivery failed.");
  }
}
