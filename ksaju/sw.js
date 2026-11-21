// K-Saju service worker: offline shell + cached engine. Bump VERSION on each deploy.
const VERSION = 'ksaju-app-v11';
const SHELL = ['./', './index.html', './reading.html', './compat.html', './privacy.html', './terms.html', './offline.html', './hub.html', './sample-report.html', './css/hub.css', './css/hub2.css?v=1', '../giun/app.js?v=7', '../giun/style.css?v=3', './lib/library.json', './lib/categories/index.json',
  './css/site.css', './css/v2.css', './manifest.webmanifest', './img/icons/icon-192.png', './img/icons/icon-512.png', './img/samchon.jpg'];
const ENGINE = 'https://cdn.jsdelivr.net/npm/manseryeok@2.0.0/';
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Never cache payments, backend or live lookups.
  if (u.hostname.includes('script.google') || u.hostname.includes('stripe') || u.hostname.includes('open-meteo')) return;
  const sameOrigin = u.origin === location.origin;
  if (r.mode === 'navigate') {   // pages: network first so updates show, cache when offline
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./offline.html'))));
    return;
  }
  if (sameOrigin || u.href.startsWith(ENGINE) || u.hostname.includes('fonts.g')) {  // assets + saju engine: cache, refresh in background
    e.respondWith(caches.match(r).then(m => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); } return res; }).catch(() => m);
      return m || net;
    }));
  }
});
