const CACHE_NAME = 'genelab-cache-v1';
const ASSETS = [
  '/pages/login.html',
  '/css/style.css',
  '/theme.css',
  '/js/app.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/theme.js',
  '/assets/icons/favicon.png',
  '/assets/icons/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  if (url.pathname.includes('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request);
      })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          // If offline and request is document, serve login
          if (e.request.mode === 'navigate') {
            return caches.match('/pages/login.html');
          }
        });
        return cachedResponse || fetchPromise;
      })
    );
  }
});
