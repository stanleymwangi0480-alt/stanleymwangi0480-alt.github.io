// Updated service worker with new cache version to force reload
const CACHE_NAME = "mystique-compass-v23-fix";
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

// Files to precache
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.svg",
  "/robots.txt",
];

// Cache asset patterns
const ASSET_RE = /\/(assets\/|icon-|favicon|manifest\.json|robots\.txt|opengraph\.jpg|background-results\.jpg)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn("[sw] precache failed for", url, err);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("mystique-compass-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) return;

  // For same-origin navigation requests, try network first
  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // For assets, use stale-while-revalidate
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      }),
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});
