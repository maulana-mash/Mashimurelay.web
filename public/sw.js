// Mashimurelay Offline Service Worker
const CACHE_NAME = 'mashimurelay-cache-v361-theme-grid';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/components_data.js',
  './js/examples_data.js',
  './js/router.js',
  './js/engine.js',
  './js/sounds_data.js',
  './js/sound_manager.js',
  './js/canvas.js',
  './js/projects.js',
  './js/instruction_video.js',
  './js/encyclopedia_data.js',
  './js/app.js',
  './assets/logo_mashimurelay.png',
  './assets/icons/icon.png',
  './assets/icons/icon432.png',
  './assets/icons/icon_1024.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network-First with Cache Fallback (guarantees local edits are loaded immediately)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Hard-block raw media file requests (prevents IDM or browser download extensions from triggering)
  const url = event.request.url.toLowerCase();
  if (url.endsWith('.mp3') || url.endsWith('.wav') || url.endsWith('.ogg') || url.includes('/assets/sounds/')) {
    event.respondWith(new Response(null, { status: 204, statusText: 'No Content' }));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return caches.match('./index.html');
        });
      })
  );
});
