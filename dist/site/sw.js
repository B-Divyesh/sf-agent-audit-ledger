const CACHE = 'aal-shell-v5';
const SHELL = ['/', '/demo', '/privacy/', '/terms/', '/404.html', '/schema/event.schema.json', '/evidence-orchard.webp', '/favicon.svg', '/apple-touch-icon.png', '/demo-route.js'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(async () => {
    if (event.request.mode !== 'navigate') return undefined;
    const fallback = await caches.match('/404.html');
    return new Response(await fallback.blob(), { status: 404, statusText: 'Not Found', headers: fallback.headers });
  })));
});
