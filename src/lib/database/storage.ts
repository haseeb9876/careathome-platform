import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { QueryExecutor } from "./data-client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;
function storageClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint || new URL(endpoint).protocol !== "https:")
    throw new Error("Private storage is not configured.");
  return (client ??= new S3Client({
    endpoint,
    region: process.env.AWS_REGION,
    forcePathStyle: true,
  }));
}
const failure = () => ({
  data: null,
  error: { message: "Private document operation failed." },
});
const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);
export function privateStorage(execute: QueryExecutor, userId?: string) {
  return {
    from(bucket: string) {
      if (bucket !== "credentials") throw new Error("Unknown private bucket.");
      const ownPath = (path: string) =>
        Boolean(
          userId &&
          path.startsWith(userId + "/") &&
          /^[a-f0-9-]+\/[a-f0-9-]+\.(pdf|png|jpg)$/.test(path),
        );
      return {
        async prepareUpload(path: string, contentType: string, size: number) {
          if (
            !ownPath(path) ||
            !allowedTypes.has(contentType) ||
            !Number.isInteger(size) ||
            size < 1 ||
            size > 5 * 1024 * 1024
          )
            return failure();
          try {
            await execute(
              "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
              [bucket, path, userId, { mimetype: contentType, size }],
            );
            const url = await getSignedUrl(
              storageClient(),
              new PutObjectCommand({
                Bucket: bucket,
                Key: path,
                ContentType: contentType,
                ContentLength: size,
                IfNoneMatch: "*",
              }),
              { expiresIn: 120 },
            );
            return { data: { url, path }, error: null };
          } catch {
            return failure();
          }
        },
        async downloadUrl(path: string) {
          try {
            const permitted = await execute(
              "select metadata from storage.objects where bucket_id=$1 and name=$2",
              [bucket, path],
            );
            if (!permitted.rows.length) return failure();
            const url = await getSignedUrl(
              storageClient(),
              new GetObjectCommand({
                Bucket: bucket,
                Key: path,
                ResponseContentDisposition:
                  'attachment; filename="credential.' +
                  path.split(".").pop() +
                  '"',
              }),
              { expiresIn: 60 },
            );
            return { data: { url }, error: null };
          } catch {
            return failure();
          }
        },
        async upload(
          path: string,
          bytes: Buffer,
          options: { contentType: string; upsert: false },
        ) {
          if (
            !ownPath(path) ||
            options.upsert ||
            !allowedTypes.has(options.contentType) ||
            !bytes.length ||
            bytes.length > 5 * 1024 * 1024
          )
            return failure();
          let inserted = false;
          try {
            // RLS authorizes the provider before the server uses its private S3 credential.
            await execute(
              "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
              [
                bucket,
                path,
                userId,
                { mimetype: options.contentType, size: bytes.length },
              ],
            );
            inserted = true;
            await storageClient().send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: path,
                Body: bytes,
                ContentType: options.contentType,
                IfNoneMatch: "*",
              }),
            );
            return { data: { path }, error: null };
          } catch {
            if (inserted)
              await execute(
                "delete from storage.objects where bucket_id=$1 and name=$2",
                [bucket, path],
              ).catch(() => undefined);
            return failure();
          }
        },
        async download(path: string) {
          try {
            const permitted = await execute(
              "select metadata from storage.objects where bucket_id=$1 and name=$2",
              [bucket, path],
            );
            if (!permitted.rows.length) return failure();
            const object = await storageClient().send(
              new GetObjectCommand({ Bucket: bucket, Key: path }),
            );
            if (
              !object.Body ||
              !object.ContentLength ||
              object.ContentLength > 5 * 1024 * 1024
            )
              return failure();
            const bytes = await object.Body.transformToByteArray();
            return {
              data: new Blob([new Uint8Array(bytes)], {
                type: object.ContentType ?? "application/octet-stream",
              }),
              error: null,
            };
          } catch {
            return failure();
          }
        },
        async remove(paths: string[]) {
          if (paths.length !== 1 || !ownPath(paths[0])) return failure();
          try {
            // Delete policy permits only this provider's unregistered upload.
            const removed = await execute(
              "delete from storage.objects where bucket_id=$1 and name=$2 returning name",
              [bucket, paths[0]],
            );
            if (!removed.rows.length) return failure();
            await storageClient().send(
              new DeleteObjectCommand({ Bucket: bucket, Key: paths[0] }),
            );
            return { data: removed.rows, error: null };
          } catch {
            return failure();
          }
        },
      };
    },
  };
}
