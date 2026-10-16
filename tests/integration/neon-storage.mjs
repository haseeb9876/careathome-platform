import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { authenticationOptions } from "../../src/lib/database/auth-options.ts";
import { applicationDatabaseConfig } from "../../src/lib/database/config.ts";
import { withDatabaseIdentity } from "../../src/lib/database/transaction.ts";
import { privateStorage } from "../../src/lib/database/storage.ts";
if (!process.env.DATABASE_URL?.includes("ep-long-sunset-b3s9l8hr-pooler"))
  throw new Error("Unexpected test target");
const app = new Pool(applicationDatabaseConfig(process.env));
const identity = new Pool(
  applicationDatabaseConfig(
    { DATABASE_URL: process.env.AUTH_DATABASE_URL },
    "careathome_auth",
  ),
);
const auth = betterAuth(
  authenticationOptions(
    identity,
    process.env.BETTER_AUTH_SECRET,
    "http://127.0.0.1:3000",
  ),
);
const execute = (id) => (sql, values) =>
  withDatabaseIdentity(
    app,
    id ? { userId: id, assurance: "aal1" } : null,
    (c) => c.query(sql, values),
  );
try {
  const suffix = randomBytes(6).toString("hex"),
    password = randomBytes(24).toString("hex");
  const provider = (
    await auth.api.signUpEmail({
      body: {
        name: "Synthetic document test",
        email: `storage-${suffix}@careathome.test`,
        password,
        accountType: "provider",
        profession: "nurse",
      },
    })
  ).user;
  const patient = (
    await auth.api.signUpEmail({
      body: {
        name: "Synthetic unauthorized reader",
        email: `reader-${suffix}@careathome.test`,
        password,
        accountType: "patient",
      },
    })
  ).user;
  const storage = privateStorage(execute(provider.id), provider.id).from(
    "credentials",
  );
  const path = `${provider.id}/${randomUUID()}.pdf`,
    bytes = Buffer.from("%PDF-1.4\nSynthetic test document only\n%%EOF");
  assert.equal(
    (
      await storage.upload(path, bytes, {
        contentType: "application/pdf",
        upsert: false,
      })
    ).error,
    null,
  );
  const downloaded = await storage.download(path);
  assert.equal(downloaded.error, null);
  assert.deepEqual(Buffer.from(await downloaded.data.arrayBuffer()), bytes);
  console.log("PASS private S3 upload and byte-exact provider download");
  assert.ok(
    (
      await privateStorage(execute(patient.id), patient.id)
        .from("credentials")
        .download(path)
    ).error,
  );
  assert.ok(
    (await privateStorage(execute(null)).from("credentials").download(path))
      .error,
  );
  console.log("PASS other patient and anonymous storage reads denied by RLS");
  assert.ok(
    (
      await privateStorage(execute(patient.id), patient.id)
        .from("credentials")
        .upload(`${patient.id}/${randomUUID()}.pdf`, bytes, {
          contentType: "application/pdf",
          upsert: false,
        })
    ).error,
  );
  assert.ok(
    (
      await storage.upload(`${patient.id}/${randomUUID()}.pdf`, bytes, {
        contentType: "application/pdf",
        upsert: false,
      })
    ).error,
  );
  console.log("PASS patient upload and cross-provider object paths denied");
  const publicResponse = await fetch(
    `${process.env.AWS_ENDPOINT_URL_S3}/credentials/${path}`,
  );
  assert.notEqual(publicResponse.status, 200);
  console.log("PASS unsigned S3 URL cannot fetch credential bytes");
  assert.equal((await storage.remove([path])).error, null);
  assert.ok((await storage.download(path)).error);
  console.log("PASS orphan cleanup removes object access");
  const largePath = `${provider.id}/${randomUUID()}.pdf`;
  const largeBytes = Buffer.alloc(5 * 1024 * 1024, 32);
  largeBytes.write("%PDF-1.4\nSynthetic maximum-size credential\n");
  const prepared = await storage.prepareUpload(largePath, "application/pdf", largeBytes.length);
  assert.equal(prepared.error, null);
  const put = await fetch(prepared.data.url, { method: "PUT", headers: { "Content-Type": "application/pdf", "If-None-Match": "*" }, body: largeBytes });
  assert.equal(put.status, 200, await put.text());
  const overwrite = await fetch(prepared.data.url, { method: "PUT", headers: { "Content-Type": "application/pdf", "If-None-Match": "*" }, body: largeBytes });
  assert.equal(overwrite.status, 412);
  const signed = await storage.downloadUrl(largePath);
  assert.equal(signed.error, null);
  const get = await fetch(signed.data.url);
  assert.equal(get.status, 200);
  assert.deepEqual(Buffer.from(await get.arrayBuffer()), largeBytes);
  assert.ok((await privateStorage(execute(patient.id), patient.id).from("credentials").downloadUrl(largePath)).error);
  assert.ok((await storage.prepareUpload(`${provider.id}/${randomUUID()}.pdf`, "application/pdf", largeBytes.length + 1)).error);
  assert.equal((await storage.remove([largePath])).error, null);
  console.log("PASS 5 MB direct signed upload/download, overwrite protection, private authorization and size limit");
} finally {
  await app.end();
  await identity.end();
}
