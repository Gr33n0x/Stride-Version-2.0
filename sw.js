// Stride service worker
// Naikkan nombor CACHE setiap kali anda ubah fail app supaya cache lama dibuang.
const CACHE = 'stride-v9';
const APP_SHELL = ['./', 'index.html', 'script.js', 'google-drive.js', 'ui.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const TAILWIND_URL = 'https://cdn.tailwindcss.com';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    // Tailwind CDN ialah skrip luar (opaque response). Kalau gagal, jangan batalkan install.
    try { await cache.add(new Request(TAILWIND_URL, { mode: 'no-cors' })); } catch (e) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
  } else if (url.hostname === 'cdn.tailwindcss.com') {
    event.respondWith(cacheFirst(req));
  }
  // Lain-lain (Google API, dll.) dibiarkan terus ke rangkaian.
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return cache.match('index.html');
    return Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}
