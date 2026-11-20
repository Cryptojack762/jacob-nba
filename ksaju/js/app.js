// K-Saju site v2: Home -> Birth form -> Result (Dustin's proposal, Nov 17). Chart math stays in saju.js.
import { buildChart, ELEMENTS, EL_HANJA, EL_KO } from './saju.js?v=8';
import { DM_READS, EL_MEANING, teaser, TYPES, PILLAR_INFO } from './content.js?v=9';
import { SITE } from './config.js?v=8';
import { encode } from './match.js?v=8';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NAMES = ['The Great Tree', 'The Flower Vine', 'The Sun', 'The Candle', 'The Mountain', 'The Garden', 'The Sword', 'The Jewel', 'The Ocean', 'The Rain'];
const STEMS_H = '甲乙丙丁戊己庚辛壬癸';
const DM_EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const LIGHT = { Earth: 1, Metal: 1 };   // element backgrounds that need dark text
let CITY = null, GENDER = '', CHART = null, TMODE = '', BLOCK = -1;
$('brand').textContent = SITE.brand;

// ---------- screens ----------
function show(id) {
  ['v-home', 'v-form', 'v-result'].forEach(v => $(v).classList.toggle('hide', v !== id));
  window.scrollTo(0, 0);
  if (id === 'v-form') track('form_open');
}
document.querySelectorAll('.goform').forEach(b => b.onclick = () => show('v-form'));
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });
$('again').onclick = () => show('v-form');

// Haneul mini avatars (face crop of the hero drawing)
(() => {
  const sv = document.querySelector('.stage svg'); if (!sv) return;
  document.querySelectorAll('.mini').forEach(m => {
    const c = sv.cloneNode(true); c.setAttribute('viewBox', '130 140 220 220'); c.setAttribute('aria-hidden', 'true'); c.removeAttribute('role'); m.appendChild(c);
  });
})();
function say(text) {
  ['bubble', 'bubble2'].forEach(id => { const b = $(id); if (!b) return; b.textContent = text; b.classList.remove('swap'); void b.offsetWidth; b.classList.add('swap'); });
}

// ---------- birthday pickers ----------
const opt = (el, v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; el.appendChild(o); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
MONTHS.forEach((m, i) => opt($('bm'), i + 1, m));
for (let d = 1; d <= 31; d++) opt($('bdd'), d, d);
for (let y = new Date().getFullYear(); y >= 1930; y--) opt($('by'), y, y);
for (let h = 1; h <= 12; h++) opt($('th'), h, h);
for (let m = 0; m < 60; m++) opt($('tm'), m, String(m).padStart(2, '0'));
const SEASON = m => [12, 1, 2].includes(m) ? 'a winter baby' : m <= 5 ? 'a spring baby' : m <= 8 ? 'a summer baby' : 'an autumn baby';
['bm', 'bdd', 'by'].forEach(id => $(id).addEventListener('change', () => {
  if ($('bm').value && $('bdd').value && $('by').value) say(`Ooh, ${SEASON(+$('bm').value)}. I already have a guess…`);
}));

// ---------- birth time: exact / roughly (12 traditional 2-hour blocks) / don't know ----------
const BLOCKS = [['Late night', '11 PM–1 AM', 0], ['Deep night', '1–3 AM', 2], ['Before dawn', '3–5 AM', 4], ['Early morning', '5–7 AM', 6], ['Morning', '7–9 AM', 8], ['Late morning', '9–11 AM', 10],
  ['Midday', '11 AM–1 PM', 12], ['Afternoon', '1–3 PM', 14], ['Late afternoon', '3–5 PM', 16], ['Evening', '5–7 PM', 18], ['Night', '7–9 PM', 20], ['Late evening', '9–11 PM', 22]];
BLOCKS.forEach(([a, b], i) => {
  const x = document.createElement('button'); x.type = 'button'; x.innerHTML = `${a}<small>${b}</small>`;
  x.onclick = () => {
    if ($('blocks').classList.contains('picked')) { openBlocks(); return; }
    $('blocks').querySelectorAll('button').forEach(z => z.classList.remove('on')); x.classList.add('on'); BLOCK = i;
    $('blocks').classList.add('picked'); $('chg').classList.remove('hide'); say('Perfect. Saju works in two-hour blocks anyway.');
  };
  $('blocks').appendChild(x);
});
function openBlocks() { $('blocks').classList.remove('picked'); $('chg').classList.add('hide'); }
$('chg').onclick = openBlocks;
function segPick(box, btn) { box.querySelectorAll('button').forEach(z => z.classList.toggle('on', z === btn)); }
$('tq').querySelectorAll('button').forEach(b => b.onclick = () => {
  TMODE = b.dataset.t; segPick($('tq'), b);
  if (TMODE === 'rough') { BLOCK = -1; $('blocks').querySelectorAll('button').forEach(z => z.classList.remove('on')); openBlocks(); }
  ['exact', 'rough', 'none'].forEach(k => $('t-' + k).classList.toggle('hide', k !== TMODE));
  $('cityset').classList.toggle('hide', TMODE === 'none');   // without a birth time the city can't change the chart
  if (TMODE === 'none') say('No problem. Your Day Master comes from your birthday.');
  if (TMODE === 'exact') say('Ooh, precise. I love it.');
});
$('gender').querySelectorAll('button').forEach(b => b.onclick = () => { segPick($('gender'), b); GENDER = b.dataset.g; });

// ---------- birth city: quick chips + live search (Open-Meteo, free) + time-zone fallback ----------
const QUICK = [
  { name: 'Los Angeles', admin1: 'California', country: 'United States', timezone: 'America/Los_Angeles', longitude: -118.24 },
  { name: 'New York', admin1: 'New York', country: 'United States', timezone: 'America/New_York', longitude: -74.01 },
  { name: 'Chicago', admin1: 'Illinois', country: 'United States', timezone: 'America/Chicago', longitude: -87.65 },
  { name: 'Houston', admin1: 'Texas', country: 'United States', timezone: 'America/Chicago', longitude: -95.36 },
  { name: 'Seoul', admin1: '', country: 'South Korea', timezone: 'Asia/Seoul', longitude: 126.98 },
  { name: 'London', admin1: 'England', country: 'United Kingdom', timezone: 'Europe/London', longitude: -0.13 },
];
const cityLabel = x => [x.name, x.admin1, x.country].filter(Boolean).join(', ');
function setCity(x, quiet) {
  CITY = x; $('city').value = cityLabel(x); $('sug').style.display = 'none'; $('cityfb').style.display = 'none';
  $('quick').querySelectorAll('button').forEach(z => z.classList.toggle('on', z.textContent === x.name && QUICK.some(q => q.name === x.name && q.longitude === x.longitude)));
  if (!quiet) say("Got it. I'll use the sun's real position over your city.");
}
QUICK.forEach(c => { const x = document.createElement('button'); x.type = 'button'; x.textContent = c.name; x.onclick = () => setCity(c); $('quick').appendChild(x); });
let tmr = null, list = [], sel = -1;
$('city').addEventListener('input', () => {
  CITY = null; clearTimeout(tmr); const q = $('city').value.trim();
  $('quick').querySelectorAll('button').forEach(z => z.classList.remove('on'));
  if (q.length < 2) { $('sug').style.display = 'none'; $('cityfb').style.display = 'none'; return; }
  tmr = setTimeout(async () => {
    try {
      const j = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=' + encodeURIComponent(q))).json();
      list = (j.results || []).filter(x => x.timezone); sel = -1;
      $('sug').innerHTML = list.map((x, i) => `<div data-i="${i}">${esc(x.name)} <small>${esc([x.admin1, x.country].filter(Boolean).join(', '))}</small></div>`).join('');
      $('sug').style.display = list.length ? 'block' : 'none';
      $('cityfb').style.display = list.length ? 'none' : 'block';
    } catch (e) { $('sug').style.display = 'none'; $('cityfb').style.display = 'block'; }
  }, 250);
});
$('sug').addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (d) { e.preventDefault(); setCity(list[+d.dataset.i]); } });
$('city').addEventListener('keydown', e => {
  if ($('sug').style.display !== 'block' || !list.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; [...$('sug').children].forEach((c, i) => c.classList.toggle('on', i === sel)); }
  if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); setCity(list[sel]); }
});
$('city').addEventListener('blur', () => setTimeout(() => { $('sug').style.display = 'none'; if (!CITY && list.length === 1) setCity(list[0], true); }, 150));
// Fallback: pick a time zone (no longitude, so the engine uses local clock time for that zone)
$('tzlink').onclick = e => {
  e.preventDefault(); $('tzbox').classList.remove('hide');
  if (!$('tz').options.length) {
    let zones = []; try { zones = Intl.supportedValuesOf('timeZone'); } catch (x) { zones = QUICK.map(q => q.timezone); }
    const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
    zones.forEach(z => opt($('tz'), z, z.replace(/_/g, ' '))); if (mine) $('tz').value = mine;
  }
  const pickTz = () => { CITY = { name: $('tz').value.split('/').pop().replace(/_/g, ' '), admin1: '', country: $('tz').value, timezone: $('tz').value, longitude: NaN }; };
  $('tz').onchange = pickTz; pickTz();
  say('No problem. Your time zone works too.');
};

function err(t) { $('err').textContent = t; $('err').style.display = t ? 'block' : 'none'; }
function ageOn(y, m, d) { const n = new Date(); let a = n.getFullYear() - y; if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < d)) a--; return a; }

// ---------- submit -> reading moment -> reveal ----------
$('form').addEventListener('submit', e => {
  e.preventDefault(); err('');
  const M = +$('bm').value, D = +$('bdd').value, Y = +$('by').value;
  if (!M || !D || !Y) { say('First, tell me your birthday!'); return err('Pick your birth month, day and year first.'); }
  const dt = new Date(Date.UTC(Y, M - 1, D));
  if (dt.getUTCMonth() !== M - 1) return err("That date doesn't exist. Please check the day.");
  if (dt > new Date()) return err('That birthday is in the future. Please check the year.');
  if (!TMODE) { say('Do you know what time you were born? "I don\'t know" is fine!'); return err('Answer the birth time question (any answer works).'); }
  let hour = null, minute = 0, timeNote = '';
  if (TMODE === 'exact') { hour = (+$('th').value % 12) + ($('tap').value === 'PM' ? 12 : 0); minute = +$('tm').value; }
  if (TMODE === 'rough') { if (BLOCK < 0) return err('Tap the part of the day you were born, or pick "I don\'t know".'); hour = BLOCKS[BLOCK][2]; timeNote = BLOCKS[BLOCK][0] + ' (' + BLOCKS[BLOCK][1] + ')'; }
  let tz, lon, cityName = '';
  if (TMODE === 'none') { tz = CITY ? CITY.timezone : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'); lon = NaN; }
  else {
    if (!CITY) { if (list.length) setCity(list[0], true); else return err('Pick your birth city, or use "Pick your time zone instead".'); }
    tz = CITY.timezone; lon = CITY.longitude; cityName = cityLabel(CITY);
  }
  let chart;
  try {
    chart = buildChart({ year: Y, month: M, day: D, hour, minute, tz, longitude: lon, gender: GENDER });
    chart.input.city = cityName; chart.input.timeMode = TMODE; if (timeNote) chart.input.timeNote = timeNote;
    chart.input.age = ageOn(Y, M, D);
  } catch (x) { console.error(x); return err('Something went wrong with that date. Please check it and try again.'); }
  CHART = chart;
  try { sessionStorage.setItem('ksaju_chart', JSON.stringify(CHART)); localStorage.setItem('ksaju_chart', JSON.stringify(CHART)); } catch (x) { }
  const ov = $('ov'); ov.classList.add('on');
  ov.querySelectorAll('.dot').forEach(d => { d.style.animation = 'none'; void d.offsetWidth; d.style.animation = ''; });
  const wait = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 1500;
  setTimeout(() => { ov.classList.remove('on'); show('v-result'); render(CHART, true); track('free_chart'); }, wait);
});

// ---------- result ----------
function hanjaSpan(p) { return `<span style="color:var(--${p.stem.element})">${p.stem.hanja}</span><br><span style="color:var(--${p.branch.element})">${p.branch.hanja}</span>`; }
function render(c, animate) {
  const dm = c.dayMaster, P = c.pillars, T = TYPES[dm.index], el = dm.element;
  const minor = c.input.age !== undefined && c.input.age < 13;   // COPPA: no email or checkout under 13
  const pil = (k, t) => P[k]
    ? `<button type="button" class="pil${k === 'day' ? ' me' : ''}" data-p="${k}" aria-controls="pinfo"><div class="t">${t}</div><div class="h">${hanjaSpan(P[k])}</div><div class="e">${P[k].stem.element}<br>${P[k].branch.animal}</div></button>`
    : `<button type="button" class="pil" data-p="${k}" aria-controls="pinfo"><div class="t">${t}</div><div class="h" style="color:var(--dim)">?<br>?</div><div class="e">time<br>unknown</div></button>`;
  const els = ELEMENTS.map(e => `<div class="el"><div class="n"><b style="color:var(--${e})">${EL_HANJA[e]}</b>${e}</div><div class="bar"><i style="width:${c.elements.pct[e]}%;background:var(--${e})"></i></div><div class="v">${c.elements.pct[e]}%</div></div>`).join('');
  const miss = c.elements.missing.length ? `Missing: <b>${c.elements.missing.join(', ')}</b>, ${c.elements.missing.map(x => EL_MEANING[x]).join('; ')}. That's where your 2027 reading has the most to say.` : 'All five elements are present in your chart, a rare balance.';
  const lk = c.luck && c.luck.current ? `<div class="fact"><div class="t">10-year luck cycle</div><div class="v serif">${c.luck.current.hanja} <span style="font-family:Inter;font-size:14px">${c.luck.current.stem.element}</span></div><div class="s">Ages ${c.luck.current.age}–${c.luck.current.ageEnd}</div></div>`
    : `<div class="fact"><div class="t">10-year luck cycle</div><div class="v">—</div><div class="s">Add gender to see it</div></div>`;
  const tz = teaser(c), live = SITE.mode === 'live';
  const offer = minor
    ? `<p style="margin-top:10px;color:var(--gold2)">Ask a parent to unlock readings for you.</p>`
    : live ? `<button class="btn" id="buy">Unlock my 2027 reading</button><div class="price2">${esc(SITE.product.price)} · Ready in about a minute · Also emailed to you</div>`
      : `<p style="margin-top:10px;color:var(--gold2)">Launching December 15. Join the list for the launch price.</p>
         <input id="em" type="email" placeholder="your@email.com" style="margin-top:10px"><button class="btn" id="wl">Join the waitlist</button>`;
  const others = TYPES.map((t, i) => `<div class="type${DM_EL[i] === 'Water' || DM_EL[i] === 'Fire' ? ' dark' : ''}${i === dm.index ? ' you' : ''}" style="background:var(--${DM_EL[i]})"><div class="th">${STEMS_H[i]}</div><div class="tn">${NAMES[i]}${i === dm.index ? ' · you' : ''}</div><div class="tk">${t.ko} · ${t.rr}</div><div class="te">${DM_EL[i]} · say it: ${t.say}</div><div class="tl">${esc(t.line)}</div></div>`);
  const order = [dm.index, ...[...Array(10).keys()].filter(i => i !== dm.index)];
  $('result').innerHTML = `
  <div class="reveal" id="reveal" style="background:var(--${el});color:${LIGHT[el] ? '#14132B' : '#F4F1EA'}" aria-live="polite">
    <div class="k">Your Day Master · 일간</div>
    <div class="big${animate ? ' go' : ''}">${dm.hanja}</div>
    <h2>${esc(dm.title)}</h2>
    <div class="lab2">${T.ko} · ${T.rr} · say it: ${T.say}</div>
    <div class="lab2" style="margin-top:4px">${dm.label} · ${EL_KO[el]} · ${dm.ko}</div>
    <p class="say">Haneul: "${esc(T.note)}"</p>
  </div>
  <div class="card fade"><p class="dmread">${DM_READS[dm.index]}</p></div>
  <div class="card fade">
    <div class="sec">Your four pillars · Saju 四柱</div>
    <div class="pillars">${pil('hour', 'Hour')}${pil('day', 'Day ★')}${pil('month', 'Month')}${pil('year', 'Year')}</div>
    <div class="pinfo" id="pinfo" aria-live="polite">Tap a pillar to see what it says about you.</div>
    <div class="note">These 8 characters are your <b>palja</b> (<span class="serif">팔자</span>, "eight characters"). Read right to left, the Korean way. ★ = you.${P.hour ? '' : ' Found your birth time? Add it and your chart fills in the hour pillar.'}</div>
    ${P.hour ? '' : '<button class="btn ghost" type="button" id="addtime">Add my birth time</button>'}
  </div>
  <div class="card fade">
    <div class="sec">Your five elements · Ohaeng 五行</div>${els}
    <div class="note" style="font-size:13px;color:var(--mut)">Strongest: <b>${c.elements.strongest}</b> (${EL_MEANING[c.elements.strongest]}). ${miss}</div>
  </div>
  <div class="card fade"><div class="facts">
    <div class="fact"><div class="t">Zodiac year</div><div class="v">${c.animal.color} ${c.animal.name}</div><div class="s serif">${P.year.hanja}</div></div>${lk}
  </div><div class="note">In saju the year starts at Ipchun (around Feb 4), so January babies often get the previous year's animal.</div></div>
  <div class="card fade">
    <div class="sec">Your 2027 reading · Red Goat year 丁未</div>
    <div>What's inside, written for ${esc(dm.title)} (${dm.hanja}):</div>
    <ul class="inside"><li>Your 2027 at a glance: what the Red Goat year means for your element</li><li>Love &amp; relationships</li><li>Career &amp; money</li><li>Your best months, with exact dates</li><li>Haneul's note to carry with you</li></ul>
    <p class="blurtxt" aria-hidden="true">${esc(tz[1])} ${esc(tz[3])}</p>
    ${offer}
    <div class="err" id="perr"></div><div class="ok hide" id="pok"></div>
  </div>
  <div class="card fade" style="text-align:center">
    <div class="sec">Share your Day Master</div>
    <button class="btn" id="card">Get my share card</button>
    <button class="btn ghost" id="inv">Send a friend their free chart</button>
    ${SITE.gunghap ? '<a class="btn ghost" href="compat.html?src=self" style="text-align:center;text-decoration:none">Compare with someone 💞</a>' : ''}
  </div>
  <section>
    <h2 class="h">Meet the other 9 types</h2>
    <p class="lead">Which one is your best friend? Your partner? Your mom? Swipe, then send them their free chart.</p>
    <div class="types">${order.map(i => others[i]).join('')}</div>
    <div class="note">Your type is your Day Master (<span class="serif">일간</span>): the element of the day you were born.</div>
  </section>
  <button class="btn ghost" type="button" data-go="v-home">Back to home</button>`;
  // tappable pillars
  $('result').querySelectorAll('button.pil').forEach(btn => btn.onclick = () => {
    $('result').querySelectorAll('button.pil').forEach(z => z.classList.toggle('sel', z === btn));
    const k = btn.dataset.p, [hz, title, desc] = PILLAR_INFO[k], p = P[k];
    const chars = p ? `<div class="pc"><b class="serif">${p.stem.hanja}</b> ${p.stem.yang ? 'Yang' : 'Yin'} ${p.stem.element} on top · <b class="serif">${p.branch.hanja}</b> ${p.branch.animal} (${p.branch.element}) below</div>`
      : '<div class="pc">We need your birth time to fill this one in.</div>';
    $('pinfo').innerHTML = `<div class="pt"><span class="serif">${hz}</span> ${k[0].toUpperCase() + k.slice(1)} pillar · ${title}</div><div>${desc}</div>${chars}`;
  });
  if ($('addtime')) $('addtime').onclick = () => { show('v-form'); $('tq').querySelector('[data-t="exact"]').click(); };
  if (!minor) { if (live) $('buy').onclick = buy; else $('wl').onclick = waitlist; }
  $('card').onclick = shareCard; $('inv').onclick = invite;
}

// ---------- backend calls ----------
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
    const j = await api({ action: 'checkout', product: SITE.product.id, chart: CHART, back: location.href.split('?')[0].split('#')[0].replace(/index\.html$/, '') });
    if (j.demo) { location.href = 'reading.html?demo=1'; return; }
    if (!j.ok || !j.url) throw new Error(j.err);
    track('checkout'); location.href = j.url;
  } catch (e) { perr('Checkout didn\'t open. Please try again.'); $('buy').disabled = false; $('buy').textContent = 'Unlock my 2027 reading'; }
}

// ---------- share card (9:16 image made on the phone, in her element's color) ----------
async function shareCard() {
  const c = CHART, dm = c.dayMaster, T = TYPES[dm.index], W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); await document.fonts.ready;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim();
  const elc = css(dm.element), dark = !LIGHT[dm.element];
  g.fillStyle = '#14132B'; g.fillRect(0, 0, W, H);
  const bg = g.createRadialGradient(W / 2, 640, 60, W / 2, 700, 1100); bg.addColorStop(0, elc); bg.addColorStop(1, '#14132B'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.fillStyle = '#F4F1EA'; g.font = '700 38px Inter'; g.fillText('MY KOREAN BIRTH CODE', W / 2, 300);
  g.fillStyle = dark ? '#F4F1EA' : '#14132B'; g.font = '700 460px "Noto Serif KR", serif'; g.fillText(dm.hanja, W / 2, 880);
  g.fillStyle = '#F4F1EA'; g.font = '800 96px Inter'; g.fillText(dm.title, W / 2, 1080);
  g.fillStyle = '#FFE9A8'; g.font = '700 50px "Noto Serif KR", Inter'; g.fillText(`${T.ko} · ${T.rr}`, W / 2, 1170);
  g.fillStyle = '#C9C4DE'; g.font = '600 40px Inter'; g.fillText(dm.label + ' · ' + c.animal.color + ' ' + c.animal.name, W / 2, 1240);
  g.fillStyle = '#F4F1EA'; g.font = '400 44px Inter'; wrapText(g, T.line, W / 2, 1340, 860, 60);
  let x = 140; ELEMENTS.forEach(e => {
    g.fillStyle = css(e); g.font = '700 70px "Noto Serif KR", serif'; g.fillText(EL_HANJA[e], x + 60, 1560);
    g.fillStyle = '#C9C4DE'; g.font = '600 34px Inter'; g.fillText(c.elements.pct[e] + '%', x + 60, 1620); x += 160;
  });
  const url = (location.host + location.pathname.replace(/index\.html$/, '')).replace(/\/$/, '');
  g.fillStyle = '#F2C230'; g.font = '700 46px Inter'; g.fillText("What's yours? Find it free", W / 2, 1740);
  g.fillStyle = '#F4F1EA'; let fs = 40; do { g.font = '600 ' + fs + 'px Inter'; fs -= 2; } while (g.measureText(url).width > 960 && fs > 20);
  g.fillText(url, W / 2, 1805);
  cv.toBlob(async blob => {
    const file = new File([blob], 'my-korean-birth-code.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My Korean birth code' }); track('share_card'); return; } catch (e) { } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-korean-birth-code.png'; a.click(); track('share_card');
  }, 'image/png');
}
function wrapText(g, t, x, y, max, lh) { const w = t.split(' '); let line = ''; w.forEach(word => { const test = line + word + ' '; if (g.measureText(test).width > max && line) { g.fillText(line.trim(), x, y); line = word + ' '; y += lh; } else line = test; }); g.fillText(line.trim(), x, y); }

// ---------- invite loop ----------
async function invite() {
  const base = location.href.split('?')[0].split('#')[0].replace(/index\.html$/, '');
  const u = SITE.gunghap ? base + 'compat.html?src=invite&c=' + encodeURIComponent(encode(CHART)) : base + '?src=invite&from=' + encodeURIComponent(CHART.dayMaster.title);
  const text = `I'm ${CHART.dayMaster.title} (${CHART.dayMaster.hanja}) in Korean saju. What's your Korean birth code? Free:`;
  if (navigator.share) { try { await navigator.share({ title: 'Korean saju', text, url: u }); track('invite'); return; } catch (e) { return; } }
  try { await navigator.clipboard.writeText(text + ' ' + u); $('inv').textContent = 'Link copied!'; track('invite'); } catch (e) { prompt('Copy this link:', u); }
}
const from = new URLSearchParams(location.search).get('from');
if (from) { $('sub').innerHTML = `A friend who is <b style="color:var(--gold2)">${esc(from)}</b> sent you this. Find your own Korean birth code and see how you match.`; say(`Your friend is ${from}. Let's find yours!`); }

// ---------- funnel analytics ----------
function track(step) {
  if (!SITE.api) return;
  try { fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'event', step, src: new URLSearchParams(location.search).get('src') || '' }), keepalive: true }); } catch (e) { }
}
track('landing');
// Coming back from the compatibility page: show the chart already made on this phone.
if (location.hash === '#mine') { try { const c = JSON.parse(sessionStorage.getItem('ksaju_chart') || 'null'); if (c) { CHART = c; show('v-result'); render(c, false); } } catch (e) { } }
