// Isolated, disposable recovery target. Never mutates the development database/bucket.
import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const url = new URL(
  process.env.DATABASE_MIGRATION_URL ?? "postgresql://invalid",
);
if (
  url.hostname !== "ep-long-sunset-b3s9l8hr.c-4.ap-southeast-1.aws.neon.tech" ||
  url.pathname !== "/careathome"
)
  throw new Error("Unexpected source configuration");
url.hostname = "ep-muddy-sky-b3qvnn35.c-4.ap-southeast-1.aws.neon.tech";
url.search = "";
const db = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 1,
});
const endpoint =
  "https://br-ancient-block-b3n4uaew.storage.c-4.ap-southeast-1.aws.neon.tech";
const s3 = new S3Client({
  endpoint,
  region: "ap-southeast-1",
  forcePathStyle: true,
});
const directory = "backups/recovery-20261016";
const key = Buffer.from(process.env.BETTER_AUTH_SECRET.slice(0, 64), "hex");
const hash = (b) => createHash("sha256").update(b).digest("hex");
async function bytes(path) {
  const result = await s3.send(
    new GetObjectCommand({ Bucket: "credentials", Key: path }),
  );
  return Buffer.from(await result.Body.transformToByteArray());
}
try {
  if (process.argv.includes("--prepare")) {
    const service = (
      await db.query(
        "select id,description from public.services where id='10000000-0000-4000-8000-000000000001'",
      )
    ).rows[0];
    const credential = (
      await db.query(
        "select c.object_path from public.credentials c join public.provider_profiles p on p.id=c.provider_id where p.demo=true limit 1",
      )
    ).rows[0];
    assert.ok(service && credential);
    const original = await bytes(credential.object_path),
      nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, nonce);
    const encrypted = Buffer.concat([cipher.update(original), cipher.final()]);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      directory + "/credential.enc",
      Buffer.concat([nonce, cipher.getAuthTag(), encrypted]),
      { flag: "wx" },
    );
    writeFileSync(
      directory + "/manifest.json",
      JSON.stringify(
        {
          service,
          objectPath: credential.object_path,
          sha256: hash(original),
          sourceBranch: "br-young-frost-b3hev45r",
          recoveryBranch: "br-ancient-block-b3n4uaew",
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    await db.query(
      "create table public.recovery_probe(marker text); insert into public.recovery_probe values('disposable recovery drill')",
    );
    await db.query(
      "update public.services set description='RECOVERY DRILL ONLY' where id=$1",
      [service.id],
    );
    await s3.send(
      new DeleteObjectCommand({
        Bucket: "credentials",
        Key: credential.object_path,
      }),
    );
    console.log(
      "Isolated recovery target prepared; encrypted object backup saved. Development remains untouched.",
    );
  } else if (process.argv.includes("--verify")) {
    const manifest = JSON.parse(
      readFileSync(directory + "/manifest.json", "utf8"),
    );
    assert.equal(
      (await db.query("select to_regclass('public.recovery_probe') as name"))
        .rows[0].name,
      null,
    );
    assert.equal(
      (
        await db.query("select description from public.services where id=$1", [
          manifest.service.id,
        ])
      ).rows[0].description,
      manifest.service.description,
    );
    console.log(
      "PASS database restored from checkpoint: original service restored and drill-only table absent",
    );
    const encrypted = readFileSync(directory + "/credential.enc"),
      decipher = createDecipheriv(
        "aes-256-gcm",
        key,
        encrypted.subarray(0, 12),
      );
    decipher.setAuthTag(encrypted.subarray(12, 28));
    const restored = Buffer.concat([
      decipher.update(encrypted.subarray(28)),
      decipher.final(),
    ]);
    assert.equal(hash(restored), manifest.sha256);
    await s3.send(
      new PutObjectCommand({
        Bucket: "credentials",
        Key: manifest.objectPath,
        Body: restored,
        ContentType: "application/pdf",
      }),
    );
    assert.equal(hash(await bytes(manifest.objectPath)), manifest.sha256);
    console.log(
      "PASS private credential restored independently from encrypted backup with matching SHA-256",
    );
  } else
    throw new Error(
      "Use --prepare or --verify for the isolated recovery drill",
    );
} finally {
  await db.end();
  s3.destroy();
}
