import type { Instrumentation } from "next";
import { safeServerError } from "@/lib/telemetry";

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  // Deliberately omit headers, cookies, request paths and exception text.
  console.error(
    JSON.stringify(
      safeServerError(
        typeof error === "object" && error !== null && "digest" in error
          ? error.digest
          : undefined,
        context.routeType,
        request.method,
      ),
    ),
  );
};
