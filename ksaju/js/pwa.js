// Registers the service worker and puts a "Download app" button at the top of every page.
// Chrome/Android/desktop: opens Chrome's install prompt. iPhone or no prompt: shows 2-step instructions.
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
let deferred = null;
window.__ksInstall = { prompt: false };   // diagnostics: true once Chrome says the app can be installed
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const UA = navigator.userAgent;
const iOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const iOSChrome = iOS && /crios/i.test(UA), iOSOther = iOS && /fxios|edgios|opios/i.test(UA);
const samsung = /samsungbrowser/i.test(UA);
const APP = /\/giun(\/|$)/i.test(location.pathname) ? 'Giun' : 'K-Saju';   // name shown in the install pop-up

function css() {
  if (document.getElementById('ks-dl-css')) return;
  const s = document.createElement('style'); s.id = 'ks-dl-css';
  s.textContent = `#ks-dl{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:8px 14px;font:800 13px Inter,sans-serif;cursor:pointer;color:#1B1406;background:#F2C230;box-shadow:0 4px 16px #f2c23040;margin-left:auto}
  .ks-dl-bar{position:sticky;top:0;z-index:45;display:flex;justify-content:flex-end;padding:10px 16px;background:#14132Bee}
  #ks-dl-help{position:fixed;inset:0;z-index:60;background:#000a;display:flex;align-items:flex-end;justify-content:center}
  #ks-dl-help .box{background:#24224A;color:#F4F1EA;border:1px solid #38355F;border-radius:20px 20px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));max-width:480px;width:100%;font:15px/1.5 Inter,sans-serif}
  #ks-dl-help h3{margin:0 0 10px;font-size:19px}#ks-dl-help ol{padding-left:20px;margin:0 0 14px}#ks-dl-help li{margin:6px 0}
  #ks-dl-help button{width:100%;border:0;border-radius:14px;padding:14px;font:800 16px Inter,sans-serif;background:#F2C230;color:#1B1406;cursor:pointer}`;
  document.head.appendChild(s);
}
function help() {
  const steps = iOSChrome
    ? '<li>Tap the <b>Share</b> button ⬆ in the address bar (top right).</li><li>Scroll down, tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>'
    : iOSOther ? '<li>Open this page in <b>Safari</b>.</li><li>Tap <b>Share</b> ⬆, then <b>Add to Home Screen</b>, then <b>Add</b>.</li>'
    : iOS ? '<li>Tap the <b>Share</b> button ⬆ at the bottom of Safari.</li><li>Scroll down, tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>'
    : samsung ? '<li>Tap the menu <b>☰</b> (bottom right).</li><li>Tap <b>Add page to</b> → <b>Home screen</b>, then <b>Add</b>.</li>'
    : '<li>Tap Chrome\'s menu <b>⋮</b> (top right).</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b> → <b>Install</b>).</li>';
  const d = document.createElement('div'); d.id = 'ks-dl-help';
  d.innerHTML = `<div class="box" role="dialog" aria-label="Download ${APP}"><h3>Download ${APP}</h3><ol>${steps}</ol><p style="color:#C9C4DE;margin:0 0 14px">It opens like a normal app from your home screen. Free, no app store.</p><button type="button" id="ks-now" style="display:none;margin-bottom:10px">⬇ Install now</button><button type="button">Got it</button></div>`;
  d.onclick = e => { if (e.target.id === 'ks-now') { d.remove(); download(); return; } if (e.target === d || e.target.tagName === 'BUTTON') d.remove(); };
  document.body.appendChild(d); if (deferred) d.querySelector('#ks-now').style.display = 'block';
}
async function download() {
  // Chrome sometimes announces "installable" a moment after the page loads: wait up to 1.5s for it.
  if (!deferred && !iOS) await new Promise(r => { const t = setTimeout(r, 1500); addEventListener('ks-bip', () => { clearTimeout(t); r(); }, { once: true }); });
  if (deferred) { deferred.prompt(); const r = await deferred.userChoice; deferred = null; if (r.outcome === 'accepted') hide(); return; }
  help();
}
function hide() { document.getElementById('ks-dl')?.remove(); document.querySelector('.ks-dl-bar')?.remove(); }
function addButton() {
  if (installed() || document.getElementById('ks-dl')) return;
  css();
  const b = document.createElement('button'); b.id = 'ks-dl'; b.type = 'button'; b.innerHTML = '⬇ Download app'; b.onclick = download;
  const head = document.querySelector('header.top');
  if (head) { const share = head.querySelector('.share-top'); share ? head.insertBefore(b, share) : head.appendChild(b); if (share) share.style.marginLeft = '8px'; }
  else { const bar = document.createElement('div'); bar.className = 'ks-dl-bar'; bar.appendChild(b); document.body.prepend(bar); }
}
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; window.__ksInstall.prompt = true;
  dispatchEvent(new Event('ks-bip')); const now = document.getElementById('ks-now'); if (now) now.style.display = 'block'; });
addEventListener('appinstalled', hide);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
