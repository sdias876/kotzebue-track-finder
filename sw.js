// Offline support: keep the app and its fonts on the phone.
const CACHE = 'tracks-v5';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Open instantly from the saved copy (no waiting on weak signal),
// and quietly fetch an update in the background for next time.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Never cache the photo server.
  if (url.hostname.includes('track-finder-api')) return;
  // The page itself: get the newest version if signal answers within 3 seconds, else use the saved copy.
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const saved = await caches.match('index.html');
      const net = fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); }
        return res;
      });
      if (!saved) return net;
      const timeout = new Promise(r => setTimeout(() => r(saved), 3000));
      return Promise.race([net.catch(() => saved), timeout]);
    })());
    return;
  }
  e.respondWith(
    caches.match(e.request).then(saved => {
      const update = fetch(e.request)
        .then(res => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => saved || caches.match('index.html'));
      return saved || update;
    })
  );
});
