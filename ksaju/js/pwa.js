// Registers the service worker and shows an "Install app" button when the browser allows it.
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
let deferred = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
function btn(label, onClick) {
  if (standalone || document.getElementById('ks-install')) return;
  const b = document.createElement('button');
  b.id = 'ks-install'; b.type = 'button'; b.textContent = label;
  b.style.cssText = 'position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:50;border:1px solid #e8c27a;background:#1b2038;color:#f6dca6;border-radius:999px;padding:10px 16px;font:700 14px Inter,sans-serif;box-shadow:0 6px 24px #0008;cursor:pointer';
  b.onclick = onClick; document.body.appendChild(b);
}
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferred = e;
  btn('⬇ Install K-Saju', async () => { deferred.prompt(); await deferred.userChoice; deferred = null; document.getElementById('ks-install')?.remove(); });
});
addEventListener('appinstalled', () => document.getElementById('ks-install')?.remove());
// iPhone/iPad: Safari has no install prompt, so show the Share → Add to Home Screen hint once.
const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
let seen = false; try { seen = localStorage.getItem('ks-ios-hint') === '1'; } catch (_) {}
if (iOS && !standalone && !seen) addEventListener('load', () => btn('Add to Home Screen: tap Share ⬆ then "Add to Home Screen"', () => {
  try { localStorage.setItem('ks-ios-hint', '1'); } catch (_) {} document.getElementById('ks-install')?.remove();
}));
