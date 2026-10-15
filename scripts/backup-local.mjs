// Local recovery drill only: never restores over the application's database or bucket.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const database =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
for (const value of [url, database])
  if (!value || !["127.0.0.1", "localhost"].includes(new URL(value).hostname))
    throw new Error("Backup tools accept only loopback services");
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sql = new pg.Client({ connectionString: database });
const docker = process.env.LOCAL_DOCKER_BIN ?? "docker";
const container = "supabase_db_careathome-platform";
const stamp =
  new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14) +
  "_" +
  randomBytes(3).toString("hex");
const folder = path.resolve("backups", stamp);
mkdirSync(path.join(folder, "objects"), { recursive: true });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function ok(r) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
async function rows(connection) {
  const { rows: tables } = await connection.query(
    "select schemaname,tablename from pg_tables where schemaname in ('public','private') order by schemaname,tablename",
  );
  const result = {};
  for (const t of tables) {
    const name = t.tablename;
    if (!/^[a-z_]+$/.test(name)) continue;
    const schema = t.schemaname;
    const r = await connection.query(
      "select count(*)::int as n from " + schema + '."' + name + '"',
    );
    result[schema + "." + name] = r.rows[0].n;
  }
  return result;
}
async function listObjects(bucket, prefix = "") {
  const found = [];
  for(let offset=0;;offset+=1000){
    const files=ok(await client.storage.from(bucket).list(prefix,{limit:1000,offset,sortBy:{column:"name",order:"asc"}}));
    for (const file of files) {
      const object = prefix ? prefix + "/" + file.name : file.name;
      if (file.id) found.push(object);
      else found.push(...(await listObjects(bucket, object)));
    }
    if(files.length<1000)break;
  }
  return found;
}
try {
  await sql.connect();
  const counts = await rows(sql);
  const dump = execFileSync(
    docker,
    [
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--format=custom",
      "--no-owner",
      "--no-privileges",
    ],
    { maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
  );
  writeFileSync(path.join(folder, "database.dump"), dump);
  const manifest = {
    created_at: new Date().toISOString(),
    database_sha256: digest(dump),
    table_counts: counts,
    objects: [],
  };
  for (const bucket of ok(await client.storage.listBuckets()))
    for (const object of await listObjects(bucket.id)) {
      const blob = ok(await client.storage.from(bucket.id).download(object));
      const bytes = Buffer.from(await blob.arrayBuffer());
      const checksum = digest(bytes),
        file = checksum + ".bin";
      writeFileSync(path.join(folder, "objects", file), bytes);
      manifest.objects.push({
        bucket: bucket.id,
        path: object,
        file,
        sha256: checksum,
        contentType: blob.type,
      });
    }
  writeFileSync(
    path.join(folder, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    "Saved database archive and " +
      manifest.objects.length +
      " separate private objects under backups/" +
      stamp +
      ".",
  );
  if (process.argv.includes("--verify-restore")) {
    const target = "careathome_restore_" + stamp;
    await sql.query('create database "' + target + '" template template0');
    execFileSync(
      docker,
      [
        "exec",
        "-i",
        container,
        "pg_restore",
        "-U",
        "postgres",
        "-d",
        target,
        "--no-owner",
        "--no-privileges",
        "--exit-on-error",
      ],
      {
        input: dump,
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const targetUrl = new URL(database);
    targetUrl.pathname = "/" + target;
    const restored = new pg.Client({ connectionString: targetUrl.toString() });
    await restored.connect();
    try {
      if (JSON.stringify(await rows(restored)) !== JSON.stringify(counts))
        throw new Error("Restored table counts differ");
    } finally {
      await restored.end();
    }
    const bucket = "restore-" + stamp;
    ok(await client.storage.createBucket(bucket, { public: false }));
    for (let i = 0; i < manifest.objects.length; i++) {
      const object = manifest.objects[i],
        bytes = readFileSync(path.join(folder, "objects", object.file));
      if (digest(bytes) !== object.sha256)
        throw new Error("Backup object checksum mismatch");
      ok(
        await client.storage
          .from(bucket)
          .upload(String(i), bytes, {
            contentType: object.contentType,
            upsert: false,
          }),
      );
      const restoredBlob = ok(
        await client.storage.from(bucket).download(String(i)),
      );
      if (
        digest(Buffer.from(await restoredBlob.arrayBuffer())) !== object.sha256
      )
        throw new Error("Restored object checksum mismatch");
    }
    writeFileSync(
      path.join(folder, "restore-evidence.json"),
      JSON.stringify(
        {
          database: target,
          bucket,
          table_counts_match: true,
          objects_verified: manifest.objects.length,
          verified_at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log(
      "Isolated database and private-bucket recovery checks passed. Recovery targets retained for inspection.",
    );
  }
} catch (error) {
  console.error(
    "Local backup/recovery did not complete: " +
      (error instanceof Error ? error.message : "local tool unavailable"),
  );
  process.exitCode = 1;
} finally {
  await sql.end();
}
