import { readFile, writeFile } from "node:fs/promises";

// One-time explicit source port. Generated migrations are checked in and immutable once applied.
const sources = [
  ["202610140001_foundation.sql", "002_foundation.sql"],
  ["202610140002_care_workflows.sql", "003_care_workflows.sql"],
  ["202610140003_operations_reports.sql", "004_operations_reports.sql"],
  ["202610150004_integrity_polish.sql", "005_integrity_polish.sql"],
];
for (const [source, target] of sources) {
  let sql = await readFile(
    new URL("../supabase/migrations/" + source, import.meta.url),
    "utf8",
  );
  sql = sql
    .replaceAll("\uFEFF", "")
    .replaceAll("auth.users", "public.identity_users")
    .replaceAll("new.raw_user_meta_data->>'role'", 'new."accountType"')
    .replaceAll("new.raw_user_meta_data->>'name'", "new.name")
    .replaceAll("new.raw_user_meta_data->>'profession'", "new.profession");
  await writeFile(
    new URL("../database/migrations/" + target, import.meta.url),
    "-- Ported from " +
      source +
      "; preserves business rules and row policies.\n" +
      sql,
    { flag: "wx" },
  );
}
console.log("Ported four SQL migrations; no database changes performed.");
