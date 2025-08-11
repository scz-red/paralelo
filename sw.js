// Paralelo BO — Service Worker
const SW_VER = 'v3';
const STATIC_CACHE = `static-${SW_VER}`;
const DYNAMIC_CACHE = `dynamic-${SW_VER}`;
const API_TTL_MS = 60_000;

// Activación inmediata y limpieza de versiones antiguas
self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    const keep = new Set([STATIC_CACHE, DYNAMIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n))));
    await self.clients.claim();
  })());
});

// Utilidades
const isGet = (req) => req.method === 'GET';
const isAPI = (url) => url.hostname.endsWith('api.lupo.lat');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isGet(request)) return; // deja pasar POST/PUT/...

  const url = new URL(request.url);

  // Navegación HTML — Network First con fallback
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await (event.preloadResponse || fetch(request));
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, res.clone());
        return res;
      } catch {
        const cached = await caches.match(request);
        return cached || new Response('<!doctype html><h1>Offline</h1>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // API de tasas — Stale-While-Revalidate con TTL
  if (isAPI(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(request);

      const freshPromise = fetch(request).then(async (res) => {
        // Guardar con marca de tiempo para TTL
        const h = new Headers(res.headers);
        h.set('sw-cache-time', Date.now().toString());
        const body = await res.clone().arrayBuffer();
        const wrapped = new Response(body, { status: res.status, statusText: res.statusText, headers: h });
        await cache.put(request, wrapped.clone());
        return res;
      }).catch(() => null);

      if (cached) {
        const t = Number(cached.headers.get('sw-cache-time') || 0);
        if (Date.now() - t < API_TTL_MS) return cached;      // Dentro de TTL
        const fresh = await freshPromise;                     // Expirado → intenta refrescar
        return fresh || cached;                               // Si falla red → sirve caché viejo
      }

      // Sin caché → intenta red primero
      try {
        const res = await fetch(request);
        const h = new Headers(res.headers);
        h.set('sw-cache-time', Date.now().toString());
        const body = await res.clone().arrayBuffer();
        await (await caches.open(DYNAMIC_CACHE)).put(request, new Response(body, { status: res.status, statusText: res.statusText, headers: h }));
        return res;
      } catch {
        return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Estáticos (css/js/img/font/CDN) — Cache First con fill
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const res = await fetch(request);
      // Solo cachear recursos estáticos
      if (['style', 'script', 'image', 'font'].includes(request.destination)) {
        const c = await caches.open(STATIC_CACHE);
        c.put(request, res.clone());
      }
      return res;
    } catch {
      // Último recurso: nada en caché y sin red
      return new Response('', { status: 504 });
    }
  })());
});
