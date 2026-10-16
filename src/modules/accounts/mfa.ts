"use server";
import { requireAccount } from "./session";
import { getAuth, authenticationPool } from "@/lib/database/auth-server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";

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
    const verified = await auth.api.verifyTOTP({
      headers: requestHeaders,
      body: { code, trustDevice: false },
    });
    // Upgrade only the session returned by successful verification, never all user sessions.
    await authenticationPool().query(
      'update public.identity_sessions set "mfaVerified"=true where token=$1 and "userId"=$2',
      [verified.token, user.id],
    );
  } catch {
    return {
      factor: "totp",
      error: "The code was not accepted. Try the current code again.",
    };
  }
  revalidatePath("/dashboard", "layout");
  return {
    verified: true,
    message: "Authenticator verified. Two-step verification is enabled.",
  };
}
