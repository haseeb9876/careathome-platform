"use server";
import { requireAccount } from "./session";
import {
  getAuth,
  authenticationPool,
  authenticationHeaders,
} from "@/lib/database/auth-server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { securitySession } from "./security";
import { consumeOtp, securityNotice } from "./otp";

type MfaState = {
  error?: string;
  message?: string;
  qr?: string;
  factor?: string;
  verified?: boolean;
  backupCodes?: string[];
};
export async function mfaAction(
  _state: MfaState,
  form: FormData,
): Promise<MfaState> {
  const { user } = await requireAccount();
  const auth = getAuth();
  const requestHeaders = await headers();
  if (form.get("operation") === "enroll") {
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (session?.user.twoFactorEnabled)
      return {
        factor: "totp",
        message: "Enter the current authenticator code to verify this session.",
      };
    const password = String(form.get("password") ?? "");
    if (!password || password.length > 128)
      return {
        error: "Enter your current password to set up an authenticator.",
      };
    try {
      const current = await securitySession(password);
      await consumeOtp(
        form,
        current.user.email,
        "mfa-enroll",
        current.session.id,
      );
      const result = await auth.api.enableTwoFactor({
        headers: requestHeaders,
        body: { password },
      });
      if (result.method !== "totp")
        return { error: "Authenticator setup is unavailable." };
      return {
        factor: "totp",
        qr: await QRCode.toDataURL(result.totpURI),
        backupCodes: result.backupCodes,
        message:
          "Save your recovery codes privately, scan the QR code, then enter the current authenticator code.",
      };
    } catch {
      return {
        error:
          "Setup could not be completed. Check your password and try again.",
      };
    }
  }
  const code = String(form.get("code") ?? "");
  if (!/^\d{6}$/.test(code))
    return { factor: "totp", error: "Enter the six-digit authenticator code." };
  try {
    await auth.api.verifyTOTP({
      headers: requestHeaders,
      body: { code, trustDevice: false },
    });
    // Enrollment rotates the cookie; the library response can contain the old token.
    // Upgrade only the authenticated session now held by this request.
    const verified = await auth.api.getSession({
      headers: await authenticationHeaders(),
      query: { disableCookieCache: true },
    });
    if (!verified || verified.user.id !== user.id)
      throw new Error("Session unavailable");
    await authenticationPool().query(
      'update public.identity_sessions set "mfaVerified"=true, "emailOtpVerified"=true where token=$1 and "userId"=$2',
      [verified.session.token, user.id],
    );
  } catch {
    return {
      factor: "totp",
      error: "The code was not accepted. Try the current code again.",
    };
  }
  revalidatePath("/dashboard", "layout");
  await securityNotice(
    user.email,
    "Authenticator verification was completed for your account.",
  );
  return {
    verified: true,
    message: "Authenticator verified. Two-step verification is enabled.",
  };
}

export async function manageMfa(
  _state: MfaState,
  form: FormData,
): Promise<MfaState> {
  try {
    const password = String(form.get("current_password") ?? "");
    const session = await securitySession(password);
    if (!session.user.twoFactorEnabled || !session.session.mfaVerified)
      return { error: "Verify your current authenticator before changing it." };
    const operation = String(form.get("operation"));
    if (operation !== "disable" && operation !== "backup")
      return { error: "Invalid operation." };
    await consumeOtp(
      form,
      session.user.email,
      operation === "disable" ? "mfa-disable" : "mfa-backup",
      session.session.id,
    );
    const auth = getAuth();
    if (operation === "backup") {
      const result = await auth.api.generateBackupCodes({
        headers: await headers(),
        body: { password },
      });
      await securityNotice(
        session.user.email,
        "Your authenticator recovery codes were replaced. Old recovery codes no longer work.",
      );
      await authenticationPool().query(
        "insert into public.audit_log(actor,action,target) values($1,'mfa_recovery_codes_changed',$1)",
        [session.user.id],
      );
      return {
        backupCodes: result.backupCodes,
        message:
          "Store these new codes privately. Your previous codes no longer work.",
      };
    }
    const admin = await authenticationPool().query(
      "select role from public.profiles where id=$1",
      [session.user.id],
    );
    if (admin.rows[0]?.role === "admin")
      return {
        error:
          "Administrators must retain authenticator protection. Use recovery codes if replacing your device.",
      };
    await auth.api.disableTwoFactor({
      headers: await headers(),
      body: { password },
    });
    await authenticationPool().query(
      'delete from public.identity_sessions where "userId"=$1',
      [session.user.id],
    );
    await securityNotice(
      session.user.email,
      "Authenticator protection was disabled. All sessions were signed out.",
    );
    revalidatePath("/dashboard", "layout");
    return { message: "Authenticator disabled. Sign in again to continue." };
  } catch {
    return {
      error:
        "Unable to change authenticator protection. Check your password, current authenticator and email code.",
    };
  }
}
