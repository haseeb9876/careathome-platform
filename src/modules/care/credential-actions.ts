"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/modules/accounts/session";

export async function prepareCredential(input: { type: string; size: number }) {
  const { client, profile } = await requireAccount();
  if (profile.role !== "provider")
    return { error: "Provider access required." };
  const parsed = z
    .object({
      type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
      size: z
        .number()
        .int()
        .min(1)
        .max(5 * 1024 * 1024),
    })
    .safeParse(input);
  if (!parsed.success)
    return { error: "Choose a PDF, JPEG or PNG up to 5 MB." };
  const extension =
    input.type === "application/pdf"
      ? "pdf"
      : input.type === "image/png"
        ? "png"
        : "jpg";
  const path = `${profile.id}/${randomUUID()}.${extension}`;
  const result = await client.storage
    .from("credentials")
    .prepareUpload(path, input.type, input.size);
  return (
    result.data ?? { error: "Unable to start the upload. Please try again." }
  );
}

export async function finishCredential(input: {
  path: string;
  label: string;
  expiry: string;
}) {
  const { client, profile } = await requireAccount();
  const parsed = z
    .object({
      path: z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(pdf|png|jpg)$/),
      label: z.string().trim().min(3).max(100),
      expiry: z.iso.date(),
    })
    .safeParse(input);
  if (
    profile.role !== "provider" ||
    !parsed.success ||
    !input.path.startsWith(profile.id + "/")
  )
    return { error: "Invalid credential details." };
  const storage = client.storage.from("credentials");
  const reject = async (error: string) => {
    await storage.remove([input.path]);
    return { error };
  };
  if (input.expiry <= new Date().toISOString().slice(0, 10))
    return reject("Choose a future expiry date.");
  const file = await storage.download(input.path);
  if (!file.data)
    return reject("Document upload was incomplete. Please retry.");
  const bytes = Buffer.from(await file.data.arrayBuffer());
  const type =
    bytes.subarray(0, 5).toString() === "%PDF-"
      ? "application/pdf"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "image/jpeg"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : null;
  if (!type || type !== file.data.type)
    return reject("File content does not match a supported document type.");
  const result = await client.rpc("register_credential", {
    p_path: input.path,
    p_label: parsed.data.label,
    p_expiry: input.expiry,
  });
  if (result.error)
    return {
      error:
        "Document could not be registered. Please refresh and check your documents before retrying.",
    };
  revalidatePath("/dashboard/profile");
  return { success: true };
}
