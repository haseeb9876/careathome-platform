import { verifyLogin, verifyRecoveryCode } from "@/modules/accounts/actions";
import { SubmitButton } from "@/components/submit-button";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <main className="auth-wrap">
      <section className="panel auth-card">
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Verify it’s you</h1>
        <p className="muted">
          Enter the current code from your authenticator app.
        </p>
        {message && (
          <p role="alert" className="notice error">
            {message}
          </p>
        )}
        <form action={verifyLogin}>
          <label>
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          <SubmitButton>Verify and continue</SubmitButton>
        </form>
        <details>
          <summary>Use a recovery code</summary>
          <p>Each saved recovery code can be used once.</p>
          <form action={verifyRecoveryCode}>
            <label>
              Recovery code
              <input
                name="recovery_code"
                autoComplete="off"
                minLength={5}
                maxLength={128}
                required
              />
            </label>
            <SubmitButton>Continue with recovery code</SubmitButton>
          </form>
        </details>
      </section>
    </main>
  );
}
