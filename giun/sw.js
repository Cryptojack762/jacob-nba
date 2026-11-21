// Giun service worker: offline ritual, library and engine. Bump VERSION on each deploy.
const VERSION = 'giun-v10';
const SHELL = ['./', './index.html', './style.css?v=1', './app.js?v=2', './manifest.webmanifest', './img/icon-192.png',
  '../ksaju/js/config.js?v=10', '../ksaju/js/saju.js?v=8', '../ksaju/js/pwa.js?v=4', '../ksaju/lib/library.json', '../ksaju/lib/categories/index.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('giun-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.includes('script.google') || u.hostname.includes('stripe') || u.hostname.includes('open-meteo')) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(VERSION).then(x => x.put('./index.html', c)); return res; }).catch(() => caches.match('./index.html'))); return; }
  if (u.origin === location.origin || u.hostname.includes('jsdelivr') || u.hostname.includes('fonts.g')) {
    e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(VERSION).then(x => x.put(r, c)); } return res; }).catch(() => m); return m || net; }));
  }
});
