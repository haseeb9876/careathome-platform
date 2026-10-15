// Read keys directly from the local CLI; never print or copy them into chat.
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
if (existsSync(".env.local"))
  throw new Error(".env.local exists; refusing to overwrite.");
const binary = path.resolve("node_modules/supabase/dist/supabase.js");
const values = JSON.parse(
  execFileSync(process.execPath, [binary, "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }),
);
const url = values.API_URL;
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Only loopback Supabase is allowed.");
writeFileSync(
  ".env.local",
  [
    "NEXT_PUBLIC_SUPABASE_URL=" + url,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" +
      (values.ANON_KEY ?? values.PUBLISHABLE_KEY),
    "SUPABASE_SERVICE_ROLE_KEY=" + values.SERVICE_ROLE_KEY,
    "APP_ORIGIN=http://127.0.0.1:3000",
    "",
  ].join("\n"),
);
console.log("Wrote ignored local environment; keys were not printed.");
