/* TamboGo · service worker: abre rápido y muestra la app aunque se corte el internet un momento.
   Sube el número de VERSION cada vez que cambies index.html para que los celulares se actualicen. */
const VERSION = 'tambogo-v7';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const LIBS = ['cdn.tailwindcss.com', 'unpkg.com', 'cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* La app: primero red (siempre la versión nueva), si no hay internet usa la copia guardada */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { if (res && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
    return;
  }

  /* Librerías externas: copia guardada primero y se refresca en segundo plano */
  if (LIBS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  /* Archivos propios (íconos, manifiesto) */
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
  /* Mapa (tiles), Firebase y el resto pasan directo a la red */
});
