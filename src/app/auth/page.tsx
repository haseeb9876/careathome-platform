import Link from "next/link";
import { authenticate } from "@/modules/accounts/actions";
import { configured } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export default async function Auth({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; message?: string }>;
}) {
  const p = await searchParams;
  const mode =
    p.mode === "register"
      ? "register"
      : p.mode === "recover"
        ? "recover"
        : "login";
  return (
    <main className="auth-wrap">
      <section className="auth-intro">
        <p className="eyebrow">YOUR CARE, CONNECTED</p>
        <h1>
          A little support.
          <br />A familiar place.
        </h1>
        <p>
          Plan home visits and keep your care journey together, one step at a
          time.
        </p>
        <div className="care-note">
          Local development environment
          <br />
          <strong>Synthetic accounts only</strong>
        </div>
      </section>
      <section className="panel auth-card">
        <p className="eyebrow">WELCOME TO CAREATHOME</p>
        <h2>
          {mode === "register"
            ? "Start your care journey"
            : mode === "recover"
              ? "Reset your password"
              : "Good to see you again"}
        </h2>
        <p className="muted">
          {mode === "register"
            ? "Create a patient account or apply as a care provider."
            : mode === "recover"
              ? "Weâ€™ll send a recovery link to the local email inbox."
              : "Sign in to your personal care workspace."}
        </p>
        {!configured() && (
          <p className="notice">
            Local authentication is not configured. Follow the local setup guide
            before signing in.
          </p>
        )}
        {p.message && (
          <p role="status" className="notice">
            {p.message}
          </p>
        )}
        <form action={authenticate}>
          <input type="hidden" name="mode" value={mode} />
          {mode === "register" && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Account type
                <select name="role">
                  <option value="patient">Patient â€” arrange home care</option>
                  <option value="provider">
                    Provider â€” apply to offer care
                  </option>
                </select>
              </label>
              <label>
                Provider profession
                <select name="profession">
                  <option value="nurse">Nurse</option>
                  <option value="physiotherapist">Physiotherapist</option>
                </select>
                <small>Only used for provider applications.</small>
              </label>
            </>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.test"
              maxLength={254}
              required
            />
          </label>
          {mode !== "recover" && (
            <label>
              Password
              <input
                aria-label="Password"
                name="password"
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                required
              />
              {mode === "register" && <small>At least 12 characters.</small>}
            </label>
          )}
          <Button disabled={!configured()}>
            {mode === "register"
              ? "Create account"
              : mode === "recover"
                ? "Send recovery link"
                : "Sign in"}
          </Button>
        </form>
        <div className="auth-links">
          <Link href={mode === "login" ? "/auth?mode=register" : "/auth"}>
            {mode === "login" ? "Create an account" : "Back to sign in"}
          </Link>
          {mode === "login" && (
            <Link href="/auth?mode=recover">Forgot password?</Link>
          )}
        </div>
      </section>
    </main>
  );
}
