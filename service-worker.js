const CACHE_NAME = "spani-rh-fiel-v3";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=3",
  "./script.js?v=3",
  "./manifest.json",
  "./assets/login-mockup.png",
  "./assets/dashboard-admin.png",
  "./assets/dashboard-lider.png",
  "./assets/escalas.png",
  "./assets/atestados-faltas.png",
  "./assets/planos-acao.png",
  "./assets/banco-horas.png",
  "./assets/eventos-ferias.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null)))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (request.method === "GET" && response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: false }) || await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });
  const networkPromise = fetch(request).then((response) => {
    if (request.method === "GET" && response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";
  const isCoreFile = ["/", "/index.html", "/style.css", "/script.js", "/manifest.json", "/service-worker.js"].includes(url.pathname);

  if (isDocument || isCoreFile) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
