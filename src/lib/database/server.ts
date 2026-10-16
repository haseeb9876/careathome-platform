import "server-only";
import { applicationDatabaseConfig } from "./config";
import { verifiedSession } from "./auth-server";
import { createDataClient } from "./data-client";
import { createHttpExecutor } from "./http";
import { privateStorage } from "./storage";

export function configured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.AUTH_DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET,
  );
}
export async function db() {
  if (!configured())
    throw new Error("Application services are not configured.");
  const session = await verifiedSession();
  const identity = session
    ? {
        userId: session.user.id,
        assurance: session.session.mfaVerified
          ? ("aal2" as const)
          : ("aal1" as const),
      }
    : null;
  const execute = createHttpExecutor(
    applicationDatabaseConfig(process.env),
    identity,
  );
  return {
    ...createDataClient(execute),
    identity,
    storage: privateStorage(execute, identity?.userId),
    auth: {
      getUser: async () => ({ data: { user: session?.user ?? null } }),
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: identity?.assurance ?? "aal1" },
        }),
      },
    },
  };
}
