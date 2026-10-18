import { AccountLink } from "@/components/account-link";
export default function EmailChangePage() {
  return (
    <main className="page-shell">
      <section className="panel account-link-panel">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Verify your new email.</h1>
        <p className="muted">
          Your current login stays active until you confirm. Confirmation signs
          out every session.
        </p>
        <AccountLink kind="email" />
      </section>
    </main>
  );
}
