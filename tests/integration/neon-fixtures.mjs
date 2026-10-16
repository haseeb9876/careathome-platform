// Synthetic development fixture helpers. Never imported by the application.
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { authenticationOptions } from "../../src/lib/database/auth-options.ts";
import { applicationDatabaseConfig } from "../../src/lib/database/config.ts";
import { withDatabaseIdentity } from "../../src/lib/database/transaction.ts";
import { createDataClient } from "../../src/lib/database/data-client.ts";
import { createHttpExecutor } from "../../src/lib/database/http.ts";
import { privateStorage } from "../../src/lib/database/storage.ts";
const url = new URL(
  process.env.DATABASE_MIGRATION_URL ?? "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Synthetic fixture target refused");
url.search = "";
export const owner = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 2,
});
const app = new Pool(applicationDatabaseConfig(process.env));
const identities = new Pool(
  applicationDatabaseConfig(
    { DATABASE_URL: process.env.AUTH_DATABASE_URL },
    "careathome_auth",
  ),
);
export const auth = betterAuth(
  authenticationOptions(
    identities,
    process.env.BETTER_AUTH_SECRET,
    "http://127.0.0.1:3000",
  ),
);
for (const pool of [owner, app, identities])
  pool.on("error", () =>
    console.error(
      "An idle test connection closed; subsequent queries will acquire a new connection.",
    ),
  );
export const close = async () => {
  await Promise.all([owner.end(), app.end(), identities.end()]);
};
export async function deniedRecordEdit(id, record) {
  try {
    await withDatabaseIdentity(app, { userId: id, assurance: "aal1" }, (c) =>
      c.query(
        "update public.session_records set observations='tampered' where id=$1",
        [record],
      ),
    );
    return { error: null };
  } catch (error) {
    return { error };
  }
}
export function clientFor(id) {
  const execute = createHttpExecutor(
    applicationDatabaseConfig(process.env),
    id ? { userId: id, assurance: "aal1" } : null,
  );
  return { ...createDataClient(execute), storage: privateStorage(execute, id) };
}
export async function createAccount(email, password, name, role) {
  const { user } = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      accountType: role === "admin" ? "patient" : role,
      ...(role === "provider" ? { profession: "nurse" } : {}),
    },
  });
  if (role === "admin") {
    await owner.query("update public.profiles set role='admin' where id=$1", [
      user.id,
    ]);
    await owner.query(
      "insert into public.audit_log(actor,action,target) values($1,'synthetic_admin_provisioned',$1)",
      [user.id],
    );
  }
  return { client: clientFor(user.id), id: user.id };
}
export async function seedServices() {
  await owner.query(`insert into public.services(id,name,category,description,duration_minutes,price_minor,currency) values
    ('10000000-0000-4000-8000-000000000001','Home nursing visit','nurse','Thoughtful nursing support in your own home. Your care needs are reviewed before confirmation.',60,350000,'PKR'),
    ('10000000-0000-4000-8000-000000000002','Physiotherapy at home','physiotherapist','Personal physiotherapy with a qualified professional, with documented progress after every visit.',45,400000,'PKR') on conflict(id) do nothing`);
}
