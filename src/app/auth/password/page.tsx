import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/security-form";
import { requireAccount } from "@/modules/accounts/session";
export const dynamic = "force-dynamic";
export default async function Password({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if ((await searchParams).token) redirect("/auth/recovery");
  await requireAccount();
  return (
    <main className="page-shell">
      <section className="panel account-link-panel">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Change your password.</h1>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
