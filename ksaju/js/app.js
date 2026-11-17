import { buildChart, ELEMENTS, EL_HANJA, EL_KO } from './saju.js?v=7';
import { DM_READS, EL_MEANING, teaser } from './content.js?v=7';
import { SITE } from './config.js?v=7';
import { encode } from './match.js?v=7';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let CITY = null, GENDER = '', CHART = null;
$('brand').textContent = SITE.brand;
$('bd').max = new Date().toISOString().slice(0, 10);

// ---- gender ----
document.querySelectorAll('#gender button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#gender button').forEach(x => x.classList.toggle('on', x === b)); GENDER = b.dataset.g;
});
$('nt').onchange = () => { $('bt').disabled = $('nt').checked; if ($('nt').checked) $('bt').value = ''; };

// ---- city search (Open-Meteo geocoding: free, no key) ----
let tmr = null, list = [], sel = -1;
$('city').addEventListener('input', () => {
  CITY = null; clearTimeout(tmr); const q = $('city').value.trim();
  if (q.length < 2) { $('sug').style.display = 'none'; return; }
  tmr = setTimeout(async () => {
    try {
      const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q));
      const j = await r.json(); list = (j.results || []).filter(x => x.timezone); sel = -1;
      $('sug').innerHTML = list.map((x, i) => `<div data-i="${i}">${esc(x.name)} <small>${esc([x.admin1, x.country].filter(Boolean).join(', '))}</small></div>`).join('') || '<div>No match, try a bigger nearby city</div>';
      $('sug').style.display = 'block';
    } catch (e) { $('sug').innerHTML = '<div>Search unavailable, check your connection</div>'; $('sug').style.display = 'block'; }
  }, 250);
});
function pick(i) { const x = list[i]; if (!x) return; CITY = x; $('city').value = [x.name, x.admin1, x.country].filter(Boolean).join(', '); $('sug').style.display = 'none'; }
$('sug').addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (d) { e.preventDefault(); pick(+d.dataset.i); } });
$('city').addEventListener('keydown', e => {
  if ($('sug').style.display !== 'block' || !list.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; [...$('sug').children].forEach((c, i) => c.classList.toggle('on', i === sel)); }
  if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); pick(sel); }
});
$('city').addEventListener('blur', () => setTimeout(() => { $('sug').style.display = 'none'; if (!CITY && list.length === 1) pick(0); }, 150));

function err(t) { $('err').textContent = t; $('err').style.display = t ? 'block' : 'none'; }

// ---- submit ----
$('form').addEventListener('submit', e => {
  e.preventDefault(); err('');
  const bd = $('bd').value; if (!bd) return err('Add your birth date.');
  if (!CITY) { if (list.length) pick(0); else return err('Pick your birth city from the list.'); }
  const [y, m, d] = bd.split('-').map(Number);
  if (y < 1900) return err('Please use a birth year from 1900 on.');
  let hour = null, minute = 0;
  if (!$('nt').checked) {
    if (!$('bt').value) return err('Add your birth time, or tick "I don\'t know my birth time".');
    [hour, minute] = $('bt').value.split(':').map(Number);
  }
  try {
    CHART = buildChart({ year: y, month: m, day: d, hour, minute, tz: CITY.timezone, longitude: CITY.longitude, gender: GENDER });
    CHART.input.city = $('city').value;
    try { sessionStorage.setItem('ksaju_chart', JSON.stringify(CHART)); } catch (x) { }
    render(CHART); track('free_chart');
  } catch (x) { console.error(x); err('Something went wrong with that date. Please check it and try again.'); }
});

// ---- render result ----
function hanjaSpan(p) { return `<span style="color:var(--${p.stem.element})">${p.stem.hanja}</span><br><span style="color:var(--${p.branch.element})">${p.branch.hanja}</span>`; }
function render(c) {
  const dm = c.dayMaster, P = c.pillars;
  const pil = (k, t) => P[k] ? `<div class="pil${k === 'day' ? ' me' : ''}"><div class="t">${t}</div><div class="h">${hanjaSpan(P[k])}</div><div class="e">${P[k].stem.element}<br>${P[k].branch.animal}</div></div>`
    : `<div class="pil"><div class="t">${t}</div><div class="h" style="color:var(--dim)">?<br>?</div><div class="e">time<br>unknown</div></div>`;
  const els = ELEMENTS.map(e => `<div class="el"><div class="n"><b style="color:var(--${e})">${EL_HANJA[e]}</b>${e}</div><div class="bar"><i style="width:${c.elements.pct[e]}%;background:var(--${e})"></i></div><div class="v">${c.elements.pct[e]}%</div></div>`).join('');
  const miss = c.elements.missing.length ? `Missing: <b>${c.elements.missing.join(', ')}</b>, ${c.elements.missing.map(x => EL_MEANING[x]).join('; ')}. Your full reading shows how to balance it.` : 'All five elements are present in your chart, a rare balance.';
  const lk = c.luck && c.luck.current ? `<div class="fact"><div class="t">10-year luck cycle</div><div class="v serif">${c.luck.current.hanja} <span style="font-family:Inter;font-size:14px">${c.luck.current.stem.element}</span></div><div class="s">Ages ${c.luck.current.age}–${c.luck.current.ageEnd}</div></div>`
    : `<div class="fact"><div class="t">10-year luck cycle</div><div class="v">—</div><div class="s">Add gender to see it</div></div>`;
  const tz = teaser(c);
  const live = SITE.mode === 'live';
  $('result').innerHTML = `
  <div class="card dm fade">
    <div class="k">Your Day Master · 일간</div>
    <div class="big">${dm.hanja}</div>
    <h2>${dm.title}</h2>
    <div class="lab">${dm.label} · ${EL_KO[dm.element]} · ${dm.ko}</div>
    <p>${DM_READS[dm.index]}</p>
  </div>
  <div class="card fade">
    <div class="sec">Your four pillars · 四柱</div>
    <div class="pillars">${pil('hour', 'Hour')}${pil('day', 'Day ★')}${pil('month', 'Month')}${pil('year', 'Year')}</div>
    <div class="note">Read right to left, the Korean way. ★ = you.</div>
  </div>
  <div class="card fade">
    <div class="sec">Five-element balance · 五行</div>${els}
    <div class="note" style="font-size:13px;color:var(--mut)">Strongest: <b>${c.elements.strongest}</b> (${EL_MEANING[c.elements.strongest]}). ${miss}</div>
  </div>
  <div class="card fade"><div class="facts">
    <div class="fact"><div class="t">Zodiac year</div><div class="v">${c.animal.color} ${c.animal.name}</div><div class="s serif">${P.year.hanja}</div></div>${lk}
  </div></div>
  <div class="card pay fade">
    <div class="blur">${tz.map((t, i) => i % 2 ? `<p>${esc(t)}</p>` : `<h4>${esc(t)}</h4>`).join('')}</div>
    <div class="lock">
      <h3>${esc(SITE.product.name)}</h3>
      <p>Your personal 2027 reading as ${esc(dm.title)} (${dm.hanja}): love, career, money and your best months, written for your exact chart.</p>
      ${live ? `<div class="price"><b>${esc(SITE.product.price)}</b></div><button class="btn" id="buy">Unlock my reading</button>`
      : `<p style="margin-top:8px;color:var(--gold2)">Launching December 15. Join the list for the launch price.</p>
         <input id="em" type="email" placeholder="your@email.com" style="margin-top:10px"><button class="btn" id="wl">Join the waitlist</button>`}
      <div class="err" id="perr"></div><div class="ok hide" id="pok"></div>
    </div>
  </div>
  <div class="card fade" style="text-align:center">
    <div class="sec">Share your Day Master</div>
    <button class="btn" id="card">Get my share card</button>
    <button class="btn ghost" id="inv">Send a friend: "How do we match?"</button>
    <a class="btn ghost" href="compat.html?src=self" style="text-align:center;text-decoration:none">Check my match with someone 💞</a>
    <button class="btn ghost" id="again">Try another birthday</button>
  </div>`;
  $('result').classList.remove('hide'); $('form').classList.add('hide'); $('hero').classList.add('hide');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (live) $('buy').onclick = buy; else $('wl').onclick = waitlist;
  $('card').onclick = shareCard; $('inv').onclick = invite;
  $('again').onclick = () => { $('result').classList.add('hide'); $('form').classList.remove('hide'); $('hero').classList.remove('hide'); window.scrollTo({ top: 0 }); };
}

// ---- backend calls ----
async function api(payload) {
  if (!SITE.api) return { ok: false, demo: true };
  const r = await fetch(SITE.api, { method: 'POST', body: JSON.stringify(payload) });
  return r.json();
}
function perr(t) { $('perr').textContent = t; $('perr').style.display = t ? 'block' : 'none'; }
async function waitlist() {
  const em = $('em').value.trim(); perr('');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return perr('Enter a valid email.');
  $('wl').disabled = true;
  try {
    const j = await api({ action: 'waitlist', email: em, dm: CHART.dayMaster.label, title: CHART.dayMaster.title, element: CHART.elements.strongest, src: new URLSearchParams(location.search).get('src') || '' });
    if (j.demo) { $('pok').textContent = 'Demo mode: the waitlist backend isn\'t connected yet.'; }
    else if (!j.ok) throw new Error(j.err);
    else $('pok').textContent = 'You\'re on the list! We\'ll email you the launch price on December 15.';
    $('pok').classList.remove('hide'); $('wl').classList.add('hide'); $('em').classList.add('hide'); track('waitlist');
  } catch (e) { perr('Couldn\'t save that, please try again.'); $('wl').disabled = false; }
}
async function buy() {
  perr(''); $('buy').disabled = true; $('buy').textContent = 'Opening secure checkout…';
  try {
    const j = await api({ action: 'checkout', product: SITE.product.id, chart: CHART, back: location.href.split('?')[0].replace(/index\.html$/, '') });
    if (j.demo) { location.href = 'reading.html?demo=1'; return; }
    if (!j.ok || !j.url) throw new Error(j.err);
    track('checkout'); location.href = j.url;
  } catch (e) { perr('Checkout didn\'t open. Please try again.'); $('buy').disabled = false; $('buy').textContent = 'Unlock my reading'; }
}

// ---- share card (9:16 image made on the phone) ----
async function shareCard() {
  const c = CHART, dm = c.dayMaster, W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); await document.fonts.ready;
  const bg = g.createRadialGradient(W / 2, 300, 50, W / 2, 700, 1300); bg.addColorStop(0, '#2c2552'); bg.addColorStop(1, '#0e1020'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.fillStyle = '#a7a9c2'; g.font = '700 38px Inter'; g.fillText('MY KOREAN DAY MASTER', W / 2, 330);
  const gold = g.createLinearGradient(0, 420, 0, 900); gold.addColorStop(0, '#f6dca6'); gold.addColorStop(1, '#e8c27a');
  g.fillStyle = gold; g.font = '700 460px "Noto Serif KR", serif'; g.fillText(dm.hanja, W / 2, 900);
  g.fillStyle = '#f4f1ea'; g.font = '800 96px Inter'; g.fillText(dm.title, W / 2, 1090);
  g.fillStyle = '#f6dca6'; g.font = '600 50px Inter'; g.fillText(dm.label + ' · ' + c.animal.color + ' ' + c.animal.name, W / 2, 1180);
  g.fillStyle = '#dcdbe8'; g.font = '400 44px Inter'; wrapText(g, dm.tag, W / 2, 1290, 860, 60);
  let x = 140; ELEMENTS.forEach(e => {
    const col = getComputedStyle(document.documentElement).getPropertyValue('--' + e).trim();
    g.fillStyle = col; g.font = '700 70px "Noto Serif KR", serif'; g.fillText(EL_HANJA[e], x + 60, 1530);
    g.fillStyle = '#a7a9c2'; g.font = '600 34px Inter'; g.fillText(c.elements.pct[e] + '%', x + 60, 1590); x += 160;
  });
  const url = (location.host + location.pathname.replace(/index\.html$/, '')).replace(/\/$/, '');
  g.fillStyle = '#e8c27a'; g.font = '700 46px Inter'; g.fillText('Find yours free', W / 2, 1720);
  g.fillStyle = '#f4f1ea'; let fs = 40; do { g.font = '600 ' + fs + 'px Inter'; fs -= 2; } while (g.measureText(url).width > 960 && fs > 20);
  g.fillText(url, W / 2, 1785);
  cv.toBlob(async blob => {
    const file = new File([blob], 'my-day-master.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My Korean Day Master' }); track('share_card'); return; } catch (e) { } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-day-master.png'; a.click(); track('share_card');
  }, 'image/png');
}
function wrapText(g, t, x, y, max, lh) { const w = t.split(' '); let line = ''; w.forEach(word => { const test = line + word + ' '; if (g.measureText(test).width > max && line) { g.fillText(line.trim(), x, y); line = word + ' '; y += lh; } else line = test; }); g.fillText(line.trim(), x, y); }

// ---- invite loop: friend gets their own free chart ----
async function invite() {
  // Invite goes to the compatibility page with a privacy-safe chart code (no birthday in the link).
  const u = location.href.split('?')[0].split('#')[0].replace(/index\.html$/, '') + 'compat.html?src=invite&c=' + encodeURIComponent(encode(CHART));
  const text = `I'm ${CHART.dayMaster.title} (${CHART.dayMaster.hanja}) in Korean saju. Get your free chart and see how we match:`;
  if (navigator.share) { try { await navigator.share({ title: 'Korean saju', text, url: u }); track('invite'); return; } catch (e) { return; } }
  try { await navigator.clipboard.writeText(text + ' ' + u); $('inv').textContent = 'Link copied!'; track('invite'); } catch (e) { prompt('Copy this link:', u); }
}
// Invited visitor banner
const from = new URLSearchParams(location.search).get('from');
if (from) { const p = document.querySelector('.hero p'); p.innerHTML = `A friend who is <b style="color:var(--gold2)">${esc(from)}</b> sent you this. Find your own Day Master and see how you match.`; }

// ---- funnel analytics (fire-and-forget to the backend sheet) ----
function track(step) {
  if (!SITE.api) return;
  try { fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'event', step, src: new URLSearchParams(location.search).get('src') || '' }), keepalive: true }); } catch (e) { }
}
track('landing');
// Coming back from the compatibility page: show the chart already made on this phone.
if (location.hash === '#mine') { try { const c = JSON.parse(sessionStorage.getItem('ksaju_chart') || 'null'); if (c) { CHART = c; render(c); } } catch (e) { } }
