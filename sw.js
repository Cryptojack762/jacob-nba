// Jacob's NBA - app shell cache (v2). Caches only the shell files so the app opens instantly;
// the bot itself (Apps Script) always loads live.
const CACHE = 'jacob-nba-shell-v2';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('jacob-nba-shell') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Only the app's own root files - other apps on this site (ksaju, phoenix) are left alone.
  const scopePath = new URL('./', self.registration.scope).pathname;
  const rel = url.pathname.slice(scopePath.length);
  if (rel.includes('/')) return;
  // Network first (fresh after updates), cache as backup (instant/offline open).
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
