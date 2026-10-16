export const dynamic = "force-dynamic";
import { changePassword } from "@/modules/accounts/actions";
import { Button } from "@/components/ui/button";
export default async function Password({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; token?: string }>;
}) {
  const { message, token } = await searchParams;
  return (
    <main className="auth-wrap">
      <section className="panel auth-card">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Choose a new password</h1>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <form action={changePassword}>
          <input name="token" type="hidden" value={token ?? ""} />
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <Button>Update password</Button>
        </form>
      </section>
    </main>
  );
}
