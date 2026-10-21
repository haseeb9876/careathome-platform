import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { sendAccountMail } from "@/modules/accounts/email";
import { authenticationOptions } from "./auth-options";
import { applicationDatabaseConfig } from "./config";
import { otpDigest } from "@/modules/accounts/otp-crypto";

let pool: Pool | undefined;
export function authenticationPool() {
  if (!pool) {
    pool = new Pool(
      applicationDatabaseConfig(
        {
          DATABASE_URL: process.env.AUTH_DATABASE_URL,
          DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
          VERCEL: process.env.VERCEL,
        },
        "careathome_auth",
      ),
    );
    pool.on("error", () =>
      console.error("An idle authentication database connection closed."),
    );
  }
  return pool;
}
function makeAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || !/^[a-f0-9]{64,}$/i.test(secret))
    throw new Error("Authentication secret is not configured.");
  const connection = authenticationPool();
  const options = authenticationOptions(
    connection,
    secret,
    process.env.APP_ORIGIN ?? "http://127.0.0.1:3000",
  );
  return betterAuth({
    ...options,
    plugins: [...options.plugins, nextCookies()],
    emailAndPassword: {
      ...options.emailAndPassword,
      sendResetPassword: async ({ user, url }) => {
        await sendAccountMail(connection, {
          to: user.email,
          subject: "Reset your Sukoonara Care password",
          text: "Use this single-use link to reset your password. Ignore it if you did not request a reset.",
          url,
        });
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session, context) => {
            const result = await connection.query(
              'select u."twoFactorEnabled", p.active from public.identity_users u join public.profiles p on p.id=u.id where u.id=$1',
              [session.userId],
            );
            if (!result.rows[0]?.active) return false;
            const verifiedPath =
              context?.path === "/two-factor/verify-totp" ||
              context?.path === "/two-factor/verify-backup-code";
            const trusted = context?.headers
              ?.get("cookie")
              ?.split(";")
              .map((v) => v.trim())
              .find((v) => v.startsWith("careathome_device="))
              ?.slice("careathome_device=".length);
            const remembered =
              trusted && /^[a-f0-9]{64}$/.test(trusted)
                ? await connection.query(
                    'select 1 from private.trusted_email_devices d join public.identity_users u on u.id=d.actor where d.token_hash=$1 and d.actor=$2 and d.expires_at>now() and u."emailVerified"',
                    [otpDigest(trusted, secret), session.userId],
                  )
                : null;
            return {
              data: {
                ...session,
                emailOtpVerified:
                  Boolean(remembered?.rowCount) ||
                  (verifiedPath && session.emailOtpVerified === true),
                otpPolicyRequired: true,
                mfaVerified:
                  result.rows[0].twoFactorEnabled === true && verifiedPath,
              },
            };
          },
        },
      },
    },
  });
}
let instance: ReturnType<typeof makeAuth> | undefined;
export function getAuth() {
  return (instance ??= makeAuth());
}
// Server actions may rotate a session cookie before rendering the updated page.
// Read the mutable cookie store so that render does not reuse the retired token.
export async function authenticationHeaders() {
  const current = new Headers(await headers());
  current.set("cookie", (await cookies()).toString());
  return current;
}
export const verifiedSession = cache(async () => {
  const session = await getAuth().api.getSession({
    headers: await authenticationHeaders(),
    query: { disableCookieCache: true },
  });
  if (
    !session ||
    (session.session.otpPolicyRequired && !session.session.emailOtpVerified) ||
    Date.now() - new Date(session.session.createdAt).getTime() >= 24 * 3600000
  )
    return null;
  const account = await authenticationPool().query(
    "select active from public.profiles where id=$1",
    [session.user.id],
  );
  return account.rows[0]?.active ? session : null;
});
