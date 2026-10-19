import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/database/auth-server";
import { SessionEmailForm } from "@/components/email-code-forms";
import { logout } from "@/modules/accounts/actions";
import { DeliveryNotice } from "@/components/account-security";
export default async function EmailCodePage() {
  // Establish request-time rendering before accessing runtime credentials.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/auth");
  if (session.session.emailOtpVerified) redirect("/dashboard");
  const [local, domain] = session.user.email.split("@");
  return (
    <main className="page-shell">
      <section className="panel account-link-panel">
        <p className="eyebrow">ONE MORE STEP TO YOUR CARE</p>
        <h1>Verify it’s you.</h1>
        <p>
          We’ll send a code to{" "}
          <strong>
            {local.slice(0, 2)}•••@{domain}
          </strong>
          . Your care workspace stays locked until you verify.
        </p>
        <DeliveryNotice />
        <SessionEmailForm />
        <form action={logout}>
          <button className="text-link">Use a different account</button>
        </form>
      </section>
    </main>
  );
}
