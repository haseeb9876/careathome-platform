import { z } from "zod";
export const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});
export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    password: z.string().min(12, "Use at least 12 characters.").max(128),
    role: z.enum(["patient", "provider"]),
    profession: z.enum(["nurse", "physiotherapist"]).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "provider" && !v.profession)
      ctx.addIssue({
        code: "custom",
        path: ["profession"],
        message: "Select your profession.",
      });
  });
