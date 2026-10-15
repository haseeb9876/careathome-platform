import { requireAccount } from "@/modules/accounts/session";
import { WorkspaceShell } from "@/components/workspace-shell";
import { MfaPanel } from "@/components/mfa-panel";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client, profile } = await requireAccount();
  if (profile.role === "admin") {
    const { data: settings } = await client
      .from("settings")
      .select("require_admin_mfa")
      .single();
    if (settings?.require_admin_mfa) {
      const { data: assurance } =
        await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2")
        return (
          <main className="auth-wrap">
            <section className="surface">
              <h1 className="text-3xl mb-5">
                Verify your administrator session
              </h1>
              <p className="muted mb-5">
                Your workspace requires an authenticator code before
                administrative information and actions are available.
              </p>
              <MfaPanel />
              <Link href="/dashboard" className="primary-link mt-5">
                Continue to workspace
              </Link>
            </section>
          </main>
        );
    }
  }
  const { count } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);
  return (
    <WorkspaceShell profile={profile} unread={count ?? 0}>
      {children}
    </WorkspaceShell>
  );
}
