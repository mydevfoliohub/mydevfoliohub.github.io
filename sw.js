const CACHE_NAME = 'deviloq-static-v3';
const CACHE_PREFIX = 'deviloq-static-';
const STATIC_URLS = [
  '/offline.html',
  '/site.webmanifest',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/pwa-maskable-512.png',
  '/favicon.ico',
  '/favicon.svg',
  '/assets/brand/deviloq-mark.svg',
  '/assets/brand/deviloq-logo.svg',
  '/css/main.css',
  '/css/product.css',
  '/js/config.js',
  '/js/main.js',
  '/js/dialogs.js',
  '/js/settings.js',
  '/js/admin.js',
  '/js/notifications.js',
  '/js/resume-studio.js',
  '/js/app.js',
  '/js/pwa.js'
];
const STATIC_PATHS = new Set(STATIC_URLS);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Pages can contain sign-in redirects or user-specific state. Never cache them.
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  if (url.search || !STATIC_PATHS.has(url.pathname)) return;

  // Cache only the explicit, public app assets above. Supabase and API traffic
  // stays on the network and is never stored by this worker.
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
