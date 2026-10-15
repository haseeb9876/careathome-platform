import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Local Supabase only.");
if (existsSync(".env.demo"))
  throw new Error(
    "Demo account manifest already exists; refusing duplicate provisioning.",
  );
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const password = randomBytes(18).toString("base64url");
const users = [
  ["patient", "Demo Patient"],
  ["provider", "Demo Nurse"],
  ["admin", "Demo Administrator"],
];
for (const [role, name] of users) {
  const { data, error } = await admin.auth.admin.createUser({
    email: role + "@careathome.test",
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: role === "admin" ? "patient" : role,
      profession: role === "provider" ? "nurse" : undefined,
    },
  });
  if (error) throw error;
  if (role === "admin") {
    const { error: e } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (e) throw e;
    await admin
      .from("audit_log")
      .insert({
        actor: data.user.id,
        action: "local_admin_provisioned",
        target: data.user.id,
      });
  }
}
writeFileSync(".env.demo", "DEMO_PASSWORD=" + password + "\n");
console.log(
  "Provisioned patient/provider/admin @careathome.test. Shared synthetic password saved to ignored .env.demo (not printed).",
);
