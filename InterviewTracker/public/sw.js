/* Interview Tracker service worker.
 *
 * Strategy (hand-rolled, no workbox):
 *  - /assets/*, *.wasm, *.woff2  → cache-first. Vite content-hashes these, so
 *    a cached copy is immutable; repeat visits skip the network entirely.
 *  - navigations, /initial-db.sqlite, /manifest.webmanifest → network-first
 *    with cache fallback, so deploys propagate but the app still boots
 *    offline. User data itself lives in IndexedDB, not here.
 *  - /__db/* (dev disk-sync) is never intercepted.
 *
 * Bump VERSION to invalidate the runtime cache wholesale.
 */
const VERSION = "v1";
const RUNTIME = `it-runtime-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    // Offline navigation to a deep link: serve the cached shell.
    if (request.mode === "navigate") {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/__db/")) return; // dev disk-sync passthrough

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    request.mode === "navigate" ||
    url.pathname === "/initial-db.sqlite" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(networkFirst(request));
  }
});
