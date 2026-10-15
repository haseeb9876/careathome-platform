"use server";
import { requireAccount } from "./session";
import { z } from "zod";
import { revalidatePath } from "next/cache";
export async function mfaAction(
  _state: {
    error?: string;
    message?: string;
    qr?: string;
    factor?: string;
    verified?: boolean;
  },
  form: FormData,
): Promise<{
  error?: string;
  message?: string;
  qr?: string;
  factor?: string;
  verified?: boolean;
}> {
  const { client } = await requireAccount();
  const operation = form.get("operation");
  if (operation === "enroll") {
    const { data: factors } = await client.auth.mfa.listFactors();
    const verified = factors?.totp.find((f) => f.status === "verified");
    if (verified)
      return {
        factor: verified.id,
        message: "Enter the current code from your authenticator.",
      };
    for (const f of factors?.all ?? [])
      if (f.status === "unverified")
        await client.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "CareAtHome authenticator",
    });
    if (error)
      return { error: "Unable to set up an authenticator. Try again." };
    return {
      qr: data.totp.qr_code,
      factor: data.id,
      message:
        "Scan this code with your authenticator, then verify a six-digit code.",
    };
  }
  const parsed = z
    .object({ factor: z.uuid(), code: z.string().regex(/^\d{6}$/) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Enter the six-digit code from your authenticator." };
  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factor,
    code: parsed.data.code,
  });
  if (error)
    return {
      error: "The code was not accepted. Try the current code again.",
      factor: parsed.data.factor,
    };
  revalidatePath("/dashboard", "layout");
  return {
    verified: true,
    message: "Two-step verification is complete for this session.",
  };
}
