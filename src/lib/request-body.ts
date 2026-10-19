export class RequestBodyTooLarge extends Error {}

/** Enforce the actual byte count, including requests without Content-Length. */
export async function boundedRequestText(request: Request, limit: number) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limit) throw new RequestBodyTooLarge();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestBodyTooLarge();
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
