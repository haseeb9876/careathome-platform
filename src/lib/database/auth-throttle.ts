import { createHmac } from "node:crypto";

export function authenticationBuckets(
  path: string,
  body: Record<string, unknown> | undefined,
  headers: Headers | undefined,
  secret: string,
  hosted: boolean,
) {
  const cookie = headers
    ?.get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) =>
      /^(?:__Secure-)?better-auth\.(session_token|two_factor)=/.test(value),
    );
  // Only email authentication endpoints may select an account from the body.
  const identity =
    path === "/sign-in/email" ||
    path === "/sign-up/email" ||
    path === "/request-password-reset"
      ? String(body?.email ?? "anonymous")
          .trim()
          .toLowerCase()
      : (cookie ?? "anonymous");
  const hash = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  const buckets = [{ key: hash(path + ":" + identity), max: 5 }];
  // Trust only the platform-provided IP header, not client X-Forwarded-For.
  if (hosted)
    buckets.push({
      key: hash(
        "auth-ip:" + (headers?.get("x-vercel-forwarded-for") ?? "unknown"),
      ),
      max: 60,
    });
  return buckets;
}
