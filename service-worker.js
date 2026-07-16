const CACHE_NAME = "spani-rh-fix-texto-login-v28";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=28",
  "./script.js?v=28",
  "./manifest.json?v=28",
  "./assets/spani-logo-oficial.png",
  "./assets/fachada-spani-login.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))));
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const core = request.mode === "navigate" || ["document","script","style","manifest"].includes(request.destination);
  if (core) {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match("./index.html")));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
