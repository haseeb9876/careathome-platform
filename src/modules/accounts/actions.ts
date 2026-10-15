"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, configured } from "@/lib/supabase/server";
import { loginSchema, registrationSchema } from "./validation";
function message(text: string, mode = "login"): never {
  redirect("/auth?mode=" + mode + "&message=" + encodeURIComponent(text));
}
export async function authenticate(form: FormData) {
  if (!configured()) message("Local services are not configured yet.");
  const mode = String(form.get("mode"));
  const client = await db();
  if (mode === "register") {
    const parsed = registrationSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) message(parsed.error.issues[0].message, "register");
    const v = parsed.data;
    const { error } = await client.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        data: { name: v.name, role: v.role, profession: v.profession },
      },
    });
    if (error)
      message(
        "Registration could not be completed. Check your details or try again later.",
        "register",
      );
    message(
      "Registration received. Check local email if confirmation is required, then sign in.",
    );
  }
  if (mode === "recover") {
    const email = z.email().safeParse(form.get("email"));
    if (!email.success) message("Enter a valid email address.", "recover");
    await client.auth.resetPasswordForEmail(email.data, {
      redirectTo:
        (process.env.APP_ORIGIN ?? "http://127.0.0.1:3000") +
        "/auth/callback?next=/auth/password",
    });
    message(
      "If the address is registered, a recovery link has been sent to the local email inbox.",
      "recover",
    );
  }
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) message("Enter a valid email address and password.");
  const { error } = await client.auth.signInWithPassword(parsed.data);
  if (error) message("Unable to sign in with those details. Please try again.");
  redirect("/dashboard");
}
export async function logout() {
  const client = await db();
  await client.auth.signOut();
  redirect("/auth");
}
export async function changePassword(form: FormData) {
  const password = z.string().min(12).max(128).safeParse(form.get("password"));
  if (!password.success)
    redirect("/auth/password?message=Use%2012%20to%20128%20characters.");
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/auth");
  const { error } = await client.auth.updateUser({ password: password.data });
  if (error)
    redirect("/auth/password?message=Password%20could%20not%20be%20updated.");
  await client.auth.signOut({ scope: "global" });
  message("Password updated. Sign in again.");
}
