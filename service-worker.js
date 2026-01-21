const CACHE_VERSION = "v2"; // ⬅️ MUDE ISSO SEMPRE QUE ALTERAR ARQUIVOS
const CACHE_NAME = `financeiro-pwa-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

// INSTALAÇÃO
self.addEventListener("install", event => {
  self.skipWaiting(); // força ativação imediata

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

// ATIVAÇÃO
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // remove cache antigo
          }
        })
      );
    })
  );

  self.clients.claim(); // controla abas abertas
});

// FETCH (estratégia correta)
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Atualiza cache com versão nova
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request)) // fallback offline
  );
});
