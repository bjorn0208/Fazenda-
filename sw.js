/* Fazenda 3D — service worker (PWA: instala no celular e joga offline) */
const SW_VERSION = 'fazenda-3d-v48';
const CORE = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SW_VERSION)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(SW_VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(SW_VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
