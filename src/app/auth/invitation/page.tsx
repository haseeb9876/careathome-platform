import { AccountLink } from "@/components/account-link";
export default function InvitationPage() {
  return (
    <main className="page-shell">
      <section className="panel account-link-panel">
        <p className="eyebrow">YOUR ADMINISTRATOR INVITATION</p>
        <h1>A trusted place on the team.</h1>
        <p className="muted">
          Accept this invitation with a dedicated administrator account. Never
          share the invitation or your password.
        </p>
        <AccountLink kind="admin" />
      </section>
    </main>
  );
}
