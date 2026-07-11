const CACHE_NAME = "spani-rh-v7-assets";
const IMAGE_ASSETS = [
  "./assets/login-bg-clean-v7.jpg",
  "./assets/logo-spani-transparente.png",
  "./assets/dashboard-admin.png",
  "./assets/dashboard-lider.png",
  "./assets/escalas.png",
  "./assets/atestados-faltas.png",
  "./assets/planos-acao.png",
  "./assets/banco-horas.png",
  "./assets/eventos-ferias.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(IMAGE_ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))));
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isCore = request.mode === "navigate" || ["document", "script", "style", "manifest"].includes(request.destination);
  if (isCore) {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match("./index.html")));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
