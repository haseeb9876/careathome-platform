/* Cache only the public offline screen and its icon, never care data or forms. */
const CACHE = "careathome-offline-v2";
const PUBLIC_FILES = ["/offline.html", "/icons/app-192.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC_FILES))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("careathome-offline-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(
        async () =>
          (await caches.match("/offline.html")) ||
          new Response("Connect to the internet and try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );
  } else if (PUBLIC_FILES.includes(url.pathname) && !url.search) {
    event.respondWith(
      fetch(request).catch(
        async () => (await caches.match(url.pathname)) || Response.error(),
      ),
    );
  }
});
