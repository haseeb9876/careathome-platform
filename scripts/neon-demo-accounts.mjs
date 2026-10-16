import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  createAccount,
  owner,
  seedServices,
  close,
} from "../tests/integration/neon-fixtures.mjs";
const password = existsSync(".env.demo")
  ? readFileSync(".env.demo", "utf8").trim().split("=")[1]
  : randomBytes(24).toString("base64url");
if (!password || password.length < 12)
  throw new Error("Invalid synthetic account manifest");
try {
  await seedServices();
  for (const [role, name] of [
    ["patient", "Ayesha - Demo Patient"],
    ["provider", "Sara Ahmed - Demo Nurse"],
    ["admin", "Demo Administrator"],
  ]) {
    const email = role + "@careathome.test";
    const existing = await owner.query(
      "select id from public.identity_users where email=$1",
      [email],
    );
    if (!existing.rows.length) await createAccount(email, password, name, role);
  }
  if (!existsSync(".env.demo"))
    writeFileSync(".env.demo", "DEMO_PASSWORD=" + password + "\n", {
      flag: "wx",
    });
  console.log(
    "Synthetic patient/provider/admin accounts ready. Password remains in ignored .env.demo.",
  );
} finally {
  await close();
}
