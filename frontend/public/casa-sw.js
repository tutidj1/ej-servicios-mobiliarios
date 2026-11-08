/* EJ Casa — service worker.
 * Solo guarda archivos estáticos de la app (para que abra rápido y muestre una pantalla de
 * "sin conexión"). NUNCA guarda datos: las consultas a la base van a otro origen y no pasan por acá. */
const VERSION = 'casa-v1';
const ESTATICO = VERSION + '-estatico';
const PRECARGA = ['/casa-pwa/offline.html', '/casa-pwa/icon-192.png', '/casa-pwa/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ESTATICO).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('casa-') && k !== ESTATICO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y cualquier otro origen: directo a la red

  // Pantallas: siempre de la red; si no hay conexión, la pantalla de "sin conexión"
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/casa-pwa/offline.html')));
    return;
  }

  // Archivos estáticos inmutables de la app
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/casa-pwa/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(ESTATICO).then((c) => c.put(req, copia)); }
        return res;
      })),
    );
  }
});
