// Service worker do money task: abre mesmo sem internet (o shell do app fica em cache).
const VERSION = '__VERSION__';
const CACHE = 'mt-' + VERSION;
const SHELL = ['./', './index.html', './assets/app.js?v=' + VERSION, './assets/app.css?v=' + VERSION, './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('mt-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca guardar chamadas ao Supabase
  if (url.hostname.endsWith('supabase.co')) return;
  // Fontes e arquivos do app: cache, depois rede
  if (url.origin === location.origin || url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.match(req, { ignoreSearch: false }).then((hit) => {
        if (hit) return hit;
        return fetch(req)
          .then((res) => {
            if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
            return res;
          })
          .catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      })
    );
  }
});
