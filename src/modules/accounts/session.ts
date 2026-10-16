import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, configured } from "@/lib/database/server";
export const requireAccount = cache(async function requireAccount() {
  if (!configured())
    redirect(
      "/auth?message=Local%20services%20must%20be%20configured%20first.",
    );
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await client
    .from("profiles")
    .select("id,name,role,active")
    .eq("id", user.id)
    .single();
  if (!profile?.active)
    redirect("/auth?message=Account%20access%20is%20unavailable.");
  return {
    client,
    user,
    profile: profile as {
      id: string;
      name: string;
      role: "patient" | "provider" | "admin";
      active: boolean;
    },
  };
});
