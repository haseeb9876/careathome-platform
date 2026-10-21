/** Edge-compatible: no exception text, stack, URL, headers or submitted data. */
export function safeServerError(
  digest: unknown,
  routeType: string,
  method: string,
) {
  return {
    event: "server_request_failed",
    digest:
      typeof digest === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(digest)
        ? digest
        : "unavailable",
    routeType: ["render", "route", "action", "proxy"].includes(routeType)
      ? routeType
      : "unknown",
    method: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ].includes(method)
      ? method
      : "unknown",
  };
}
