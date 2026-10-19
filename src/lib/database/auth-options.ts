import type { Pool } from "pg";
import type { BetterAuthOptions } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { z } from "zod";
import { createHmac } from "node:crypto";
import { APIError, createAuthMiddleware } from "better-auth/api";

/** Shared by schema generation and the runtime; passwords use Better Auth's hashing. */
export function authenticationOptions(
  database: Pool,
  secret: string,
  baseURL: string,
) {
  return {
    appName: "CareAtHome",
    database,
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ![
            "/sign-in/email",
            "/sign-up/email",
            "/request-password-reset",
            "/reset-password",
            "/verify-password",
            "/change-password",
            "/revoke-session",
            "/revoke-sessions",
            "/revoke-other-sessions",
            "/two-factor/enable",
            "/two-factor/verify-totp",
            "/two-factor/verify-backup-code",
          ].includes(ctx.path)
        )
          return;
        const authCookie = ctx.headers
          ?.get("cookie")
          ?.split(";")
          .map((c) => c.trim())
          .find((c) =>
            /^(?:__Secure-)?better-auth\.(session_token|two_factor)=/.test(c),
          );
        const identity = String(
          ctx.body?.email ?? ctx.body?.token ?? authCookie ?? "anonymous",
        )
          .trim()
          .toLowerCase();
        const key = createHmac("sha256", secret)
          .update(ctx.path + ":" + identity)
          .digest("hex");
        const result = await database.query(
          `insert into private.auth_attempts(key_hash) values($1)
        on conflict(key_hash) do update set
        attempts=case when auth_attempts.window_started < now()-interval '60 seconds' then 1 else auth_attempts.attempts+1 end,
        window_started=case when auth_attempts.window_started < now()-interval '60 seconds' then now() else auth_attempts.window_started end
        returning attempts`,
          [key],
        );
        if (result.rows[0].attempts > 5)
          throw new APIError("TOO_MANY_REQUESTS", {
            message: "Too many attempts. Wait a minute and try again.",
          });
      }),
    },
    advanced: { database: { generateId: "uuid" as const } },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      modelName: "identity_users",
      additionalFields: {
        accountType: {
          type: "string" as const,
          required: true,
          defaultValue: "patient",
          validator: { input: z.enum(["patient", "provider"]) },
        },
        profession: {
          type: "string" as const,
          required: false,
          validator: { input: z.enum(["nurse", "physiotherapist"]).optional() },
        },
      },
    },
    session: {
      modelName: "identity_sessions",
      expiresIn: 30 * 60,
      updateAge: 60,
      cookieCache: { enabled: false },
      additionalFields: {
        emailOtpVerified: {
          type: "boolean" as const,
          defaultValue: false,
          input: false,
        },
        otpPolicyRequired: {
          type: "boolean" as const,
          defaultValue: true,
          input: false,
        },
        mfaVerified: {
          type: "boolean" as const,
          defaultValue: false,
          input: false,
        },
      },
    },
    account: { modelName: "identity_accounts" },
    verification: { modelName: "identity_verifications" },
    rateLimit: {
      enabled: true,
      storage: "database" as const,
      modelName: "identity_rate_limits",
      window: 60,
      max: 30,
    },
    plugins: [
      twoFactor({
        issuer: "CareAtHome",
        schema: { twoFactor: { modelName: "identity_two_factors" } },
      }),
    ],
  } satisfies BetterAuthOptions;
}
