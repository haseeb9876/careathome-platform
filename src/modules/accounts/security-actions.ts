"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuth, authenticationPool } from "@/lib/database/auth-server";
import {
  requestAccountLink,
  securityError,
  securitySession,
  tokenHash,
} from "./security";
import { sendAccountMail } from "./email";

export type SecurityState = { error?: string; message?: string };
const passwordSchema = z
  .string()
  .min(12, "Use 12 to 128 characters for your new password")
  .max(128);
const emailSchema = z
  .email()
  .max(254)
  .transform((email) => email.trim().toLowerCase());

export async function changeOwnPassword(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  const parsed = passwordSchema.safeParse(form.get("new_password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data !== form.get("confirm_password"))
    return { error: "The new passwords do not match" };
  const current = String(form.get("current_password") ?? "");
  if (current === parsed.data)
    return { error: "Choose a password different from your current password" };
  try {
    const session = await securitySession(current);
    await getAuth().api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: current,
        newPassword: parsed.data,
        revokeOtherSessions: true,
      },
    });
    // Also retire the replacement session: require a fresh login, including MFA.
    await authenticationPool().query(
      'delete from public.identity_sessions where "userId"=$1',
      [session.user.id],
    );
  } catch (error) {
    return { error: securityError(error) };
  }
  redirect(
    "/auth?message=" +
      encodeURIComponent(
        "Password changed. Sign in with your new password. All previous sessions were signed out.",
      ),
  );
}
export async function requestEmailChange(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid new email address" };
  try {
    const message = await requestAccountLink(
      "email",
      email.data,
      String(form.get("current_password") ?? ""),
    );
    revalidatePath("/dashboard/settings");
    return { message };
  } catch (error) {
    return { error: securityError(error) };
  }
}
export async function inviteAdministrator(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success)
    return { error: "Enter a valid invitation email address" };
  try {
    const message = await requestAccountLink(
      "admin",
      email.data,
      String(form.get("current_password") ?? ""),
    );
    revalidatePath("/dashboard/users");
    return { message };
  } catch (error) {
    return { error: securityError(error) };
  }
}
export async function revokeAccountLink(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid request" };
  try {
    const session = await securitySession(
      String(form.get("current_password") ?? ""),
    );
    await authenticationPool().query(
      "select private.account_link_revoke($1,$2)",
      [session.session.id, id.data],
    );
    revalidatePath("/dashboard", "layout");
    return { message: "Invitation or verification request revoked." };
  } catch (error) {
    return { error: securityError(error) };
  }
}
export async function revokeAccountSessions(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  const target = form.get("id") ? z.uuid().safeParse(form.get("id")) : null;
  if (target && !target.success) return { error: "Invalid session" };
  try {
    const session = await securitySession(
      String(form.get("current_password") ?? ""),
    );
    await authenticationPool().query(
      "select private.account_sessions_revoke($1,$2)",
      [session.session.id, target?.data ?? null],
    );
    revalidatePath("/dashboard/settings");
    return { message: "Other selected sessions have been signed out." };
  } catch (error) {
    return { error: securityError(error) };
  }
}
export async function previewAccountLink(
  token: string,
): Promise<{ kind?: string; email?: string; error?: string }> {
  try {
    const result = await authenticationPool().query(
      "select * from private.account_link_preview($1)",
      [tokenHash(token)],
    );
    if (!result.rows.length)
      throw new Error("Link is invalid, expired or already used");
    return { kind: result.rows[0].kind, email: result.rows[0].email };
  } catch (error) {
    return { error: securityError(error) };
  }
}
export async function confirmEmailChange(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  try {
    const session = await securitySession(
      String(form.get("current_password") ?? ""),
    );
    const pool = authenticationPool();
    const result = await pool.query(
      "select private.account_email_confirm($1,$2) as old_email",
      [session.session.id, tokenHash(String(form.get("token") ?? ""))],
    );
    // The change is committed; notification failure must not ask the user to repeat it.
    try {
      await sendAccountMail(pool, {
        to: result.rows[0].old_email,
        subject: "Your CareAtHome login email changed",
        text: "Your login email was changed and all sessions were signed out. If this was not you, contact your care administrator immediately.",
      });
    } catch {
      console.error(
        "Account email changed; previous-address notification could not be delivered.",
      );
    }
  } catch (error) {
    return { error: securityError(error) };
  }
  redirect(
    "/auth?message=" +
      encodeURIComponent(
        "Email verified and changed. Sign in with your new email address.",
      ),
  );
}
export async function acceptAdminInvitation(
  _state: SecurityState,
  form: FormData,
): Promise<SecurityState> {
  try {
    const token = String(form.get("token") ?? "");
    const preview = await previewAccountLink(token);
    if (preview.kind !== "admin" || !preview.email)
      throw new Error("Link is invalid, expired or already used");
    let userId: string;
    if (form.get("existing") === "true") {
      const session = await securitySession(
        String(form.get("current_password") ?? ""),
      );
      if (session.user.email.toLowerCase() !== preview.email)
        throw new Error("Use a separate new administrator account");
      userId = session.user.id;
    } else {
      const password = passwordSchema.safeParse(form.get("new_password"));
      const name = z
        .string()
        .trim()
        .min(2)
        .max(100)
        .safeParse(form.get("name"));
      if (!password.success || !name.success)
        return {
          error: "Enter your full name and a password of 12 to 128 characters",
        };
      if (password.data !== form.get("confirm_password"))
        return { error: "The new passwords do not match" };
      const result = await getAuth().api.signUpEmail({
        headers: await headers(),
        body: {
          email: preview.email,
          name: name.data,
          password: password.data,
          accountType: "patient",
        },
      });
      userId = result.user.id;
    }
    await authenticationPool().query(
      "select private.account_invitation_accept($1,$2)",
      [tokenHash(token), userId],
    );
  } catch (error) {
    return { error: securityError(error) };
  }
  redirect(
    "/auth?message=" +
      encodeURIComponent(
        "Administrator account ready. Sign in, then set up two-step verification in Settings & security.",
      ),
  );
}
