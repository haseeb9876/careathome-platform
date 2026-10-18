"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { configured } from "@/lib/database/server";
import { getAuth } from "@/lib/database/auth-server";
import { accountEmailMode } from "./email";
import { loginSchema, registrationSchema } from "./validation";
function message(text: string, mode = "login"): never {
  redirect("/auth?mode=" + mode + "&message=" + encodeURIComponent(text));
}
export async function authenticate(form: FormData) {
  if (!configured()) message("Application services are not configured yet.");
  const mode = String(form.get("mode"));
  const auth = getAuth();
  const requestHeaders = await headers();
  if (mode === "register") {
    const parsed = registrationSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) message(parsed.error.issues[0].message, "register");
    const v = parsed.data;
    let failed = false;
    try {
      await auth.api.signUpEmail({
        headers: requestHeaders,
        body: {
          email: v.email,
          password: v.password,
          name: v.name,
          accountType: v.role,
          ...(v.role === "provider" ? { profession: v.profession } : {}),
        },
      });
    } catch {
      failed = true;
    }
    if (failed)
      message(
        "Registration could not be completed. Check your details or try again later.",
        "register",
      );
    message("Registration received. You can now sign in.");
  }
  if (mode === "recover") {
    const email = z.email().safeParse(form.get("email"));
    if (!email.success) message("Enter a valid email address.", "recover");
    try {
      await auth.api.requestPasswordReset({
        headers: requestHeaders,
        body: {
          email: email.data,
          redirectTo:
            (process.env.APP_ORIGIN ?? "http://127.0.0.1:3000") +
            "/auth/password",
        },
      });
    } catch {
      /* Preserve the same public response to avoid account enumeration. */
    }
    message(
      accountEmailMode() === "resend"
        ? "If the address is registered, recovery instructions will arrive by email. Check your inbox and spam folder."
        : "Real email delivery is not configured yet. Contact your administrator for help. Synthetic recovery messages are available in the private demonstration inbox.",
      "recover",
    );
  }
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) message("Enter a valid email address and password.");
  let failed = false,
    needsMfa = false;
  try {
    const result = await auth.api.signInEmail({
      headers: requestHeaders,
      body: parsed.data,
    });
    needsMfa =
      "twoFactorRedirect" in result && result.twoFactorRedirect === true;
  } catch {
    failed = true;
  }
  if (failed)
    message("Unable to sign in with those details. Please try again.");
  redirect(needsMfa ? "/auth/verify" : "/dashboard");
}
export async function logout() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/auth");
}
export async function changePassword(form: FormData) {
  const parsed = z
    .object({
      password: z.string().min(12).max(128),
      token: z.string().min(10).max(256),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    message(
      "Use a valid recovery link and a password with 12 to 128 characters.",
      "recover",
    );
  let failed = false;
  try {
    await getAuth().api.resetPassword({
      headers: await headers(),
      body: { newPassword: parsed.data.password, token: parsed.data.token },
    });
  } catch {
    failed = true;
  }
  if (failed)
    message(
      "Recovery link is invalid or expired. Request a new link.",
      "recover",
    );
  message("Password updated. Sign in again.");
}
export async function verifyLogin(form: FormData) {
  const code = z
    .string()
    .regex(/^\d{6}$/)
    .safeParse(form.get("code"));
  if (!code.success)
    redirect("/auth/verify?message=Enter%20a%20six-digit%20code.");
  let failed = false;
  try {
    await getAuth().api.verifyTOTP({
      headers: await headers(),
      body: { code: code.data, trustDevice: false },
    });
  } catch {
    failed = true;
  }
  if (failed)
    redirect(
      "/auth/verify?message=The%20code%20was%20not%20accepted.%20Try%20again.",
    );
  redirect("/dashboard");
}
export async function verifyRecoveryCode(form: FormData) {
  const code = z.string().min(5).max(128).safeParse(form.get("recovery_code"));
  if (!code.success)
    redirect("/auth/verify?message=Enter%20a%20recovery%20code.");
  let failed = false;
  try {
    await getAuth().api.verifyBackupCode({
      headers: await headers(),
      body: { code: code.data, trustDevice: false },
    });
  } catch {
    failed = true;
  }
  if (failed)
    redirect("/auth/verify?message=Recovery%20code%20was%20not%20accepted.");
  redirect("/dashboard");
}
