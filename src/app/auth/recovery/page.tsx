import Link from "next/link";
import { OtpRecoveryForm } from "@/components/email-code-forms";
import { DeliveryNotice } from "@/components/account-security";
export default function RecoveryPage() {
  return (
    <main className="page-shell">
      <section className="panel account-link-panel">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>A secure way back.</h1>
        <p>Verify your email to choose a new password.</p>
        <DeliveryNotice />
        <OtpRecoveryForm />
        <Link href="/auth" className="text-link">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
