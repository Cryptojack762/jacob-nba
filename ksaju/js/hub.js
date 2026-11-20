// K-Saju hub: Today · Library · Books · Me. Features not built yet show a "Soon" button (switch on in config.js → features).
import { SITE } from './config.js?v=9';
const $ = s => document.querySelector(s), V = $('#view');
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
const F = SITE.features || {};
let LIB = null;
const lib = async () => LIB || (LIB = await (await fetch('lib/library.json')).json());
const soon = (label, note) => `<button class="btn ghost soon" type="button" data-soon="${esc(note || '')}">${esc(label)} <span class="badge">Soon</span></button>`;

// ---------- Today's pillar (day index = days since 1900-01-01 + 10, mod 60; 1900-01-01 was 甲戌) ----------
const STEMS_H = '甲乙丙丁戊己庚辛壬癸', BR_H = '子丑寅卯辰巳午未申酉戌亥';
const EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
function todayPillar(d = new Date()) {
  const days = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1900, 0, 1)) / 864e5);
  const i = ((days + 10) % 60 + 60) % 60, s = i % 10, b = i % 12;
  return { hanja: STEMS_H[s] + BR_H[b], element: EL[s], yang: s % 2 === 0, animal: ANIMALS[b] };
}
const ORDER = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];   // each feeds the next; each controls the one two ahead
const GOD = {   // relation of today's element to your Day Master element
  same: ['Friend day', 'Your own element is strong today. Good for teamwork and standing your ground. Watch for stubbornness.'],
  output: ['Expression day', 'Your energy flows outward. Good for making, teaching, cooking and speaking up. Rest before you run dry.'],
  wealth: ['Wealth day', 'You have the upper hand on what you go after. Good for money tasks, errands and finishing. Don\'t overreach.'],
  power: ['Pressure day', 'Outside demands are stronger today. Good for discipline and rules. Pick your battles and breathe.'],
  resource: ['Support day', 'Today feeds you. Good for learning, asking for help and recovering. Say yes to support.'],
};
function relation(me, day) {
  const a = ORDER.indexOf(me), b = ORDER.indexOf(day), k = (b - a + 5) % 5;
  return ['same', 'output', 'wealth', 'power', 'resource'][k];
}
const dateKey = d => d.toISOString().slice(0, 10);

async function today() {
  const chart = ls.get('ksaju_chart', null), tp = todayPillar(), L = await lib();
  const n = Math.floor(Date.now() / 864e5), tip = L.tips[n % L.tips.length];
  let msg = `<div class="card"><p class="lead">Get your free reading first and Today becomes personal.</p><a class="btn" href="index.html">Get my reading</a></div>`;
  if (chart && chart.dayMaster) {
    const [t, m] = GOD[relation(chart.dayMaster.element, tp.element)];
    msg = `<div class="card el-${tp.element}"><div class="kick">${esc(chart.dayMaster.title || chart.dayMaster.label)} · ${esc(chart.dayMaster.label)}</div><h2>${t}</h2><p>${m}</p></div>`;
  }
  // streak
  const st = ls.get('ks_streak', { last: null, n: 0, best: 0 }), tk = dateKey(new Date()), yk = dateKey(new Date(Date.now() - 864e5));
  const done = st.last === tk, live = done || st.last === yk ? st.n : 0;
  const j = ls.get('ks_journal', {});
  V.innerHTML = `
  <h1 class="pg">Today <span class="serif">${tp.hanja}</span></h1>
  <p class="lead">${tp.yang ? 'Yang' : 'Yin'} ${tp.element} ${tp.animal} day</p>
  ${msg}
  <div class="card"><div class="kick">Tip of the day</div><p>${esc(tip.tip_trick)}</p></div>
  <div class="card row"><div><div class="big">${live}🔥</div><div class="micro" style="text-align:left">day streak · best ${Math.max(st.best, live)}</div></div>
    <button class="btn sm" id="check" type="button" ${done ? 'disabled' : ''}>${done ? 'Checked in ✓' : 'Check in'}</button></div>
  <div class="card"><div class="kick">Journal</div><textarea id="jr" rows="4" placeholder="One line about today…">${esc(j[tk] || '')}</textarea>
    <button class="btn ghost sm" id="jsave" type="button">Save</button> <span class="micro" id="jmsg"></span></div>
  <div class="card"><div class="kick">Daily reading time</div>
    <div class="row"><input type="time" id="rt" value="${esc(ls.get('ks_time', '08:00'))}"><span class="micro" id="rtmsg"></span></div>
    ${F.dailyPush ? '' : soon('Send it to my phone', 'Daily phone reminders are coming soon.')}</div>`;
  $('#check').onclick = () => { const n2 = (st.last === yk ? st.n : 0) + 1; ls.set('ks_streak', { last: tk, n: n2, best: Math.max(st.best, n2) }); today(); };
  $('#jsave').onclick = () => { j[tk] = $('#jr').value.trim(); ls.set('ks_journal', j); $('#jmsg').textContent = 'Saved on this phone'; };
  $('#rt').onchange = e => { ls.set('ks_time', e.target.value); $('#rtmsg').textContent = 'Saved'; };
}

// ---------- Library (one folder + one script per category: lib/categories/<slug>/) ----------
const H = { entries: d => d.entries.map(e => `<details class="card ent"><summary>${esc(e.title)}</summary><p>${esc(e.content)}</p><div class="micro" style="text-align:left">${esc(e.label)} · ${esc(e.source)}</div></details>`).join('') };
window.KS_VIEWS = window.KS_VIEWS || {};
async function library(slug) {
  if (slug) {
    const d = await (await fetch(`lib/categories/${slug}/data.json`)).json();
    if (!window.KS_VIEWS[slug]) await new Promise(r => { const s = document.createElement('script'); s.src = `lib/categories/${slug}/view.js`; s.onload = s.onerror = r; document.head.appendChild(s); });
    const body = (window.KS_VIEWS[slug] || H.entries)(d, H);
    V.innerHTML = `<a class="back" href="#library">← Library</a><h1 class="pg">${esc(d.name)}</h1>${body}`;
    return;
  }
  const idx = await (await fetch('lib/categories/index.json')).json();
  const grp = k => idx.filter(c => c.kind === k);
  const tile = c => `<a class="tile" href="#library/${c.slug}"><b>${esc(c.name)}</b><span>${c.count}</span></a>`;
  V.innerHTML = `<h1 class="pg">Library</h1><p class="lead">Korean tradition and plain-English wellness basics, each with its source.</p>
    <h3 class="sub">Saju & tradition</h3><div class="tiles">${grp('tradition').map(tile).join('')}</div>
    <h3 class="sub">Wellness</h3><div class="tiles">${idx.filter(c => c.kind !== 'tradition').map(tile).join('')}</div>`;
}

// ---------- Books (free public-domain) + Listen (uses the phone's built-in voice) ----------
async function books() {
  const L = await lib();
  V.innerHTML = `<h1 class="pg">Free books</h1><p class="lead">Public-domain classics with a short summary. Tap Listen to hear it.</p>` +
    L.books.map((b, i) => `<div class="card"><b>${esc(b.title)}</b><div class="micro" style="text-align:left">${esc(b.author)} · ${esc(b.notes || '')}</div>
      <p>${esc(b.summary || '')}</p><div class="row"><button class="btn sm" data-say="${i}" type="button">▶ Listen</button>
      <a class="btn ghost sm" href="${esc(b.source_url)}" target="_blank" rel="noopener">Read free</a></div></div>`).join('') +
    (F.proAudio ? '' : soon('Narrated audio editions', 'Narrated audio is coming soon.'));
  V.querySelectorAll('[data-say]').forEach(btn => btn.onclick = () => {
    if (!('speechSynthesis' in window)) { btn.textContent = 'No voice on this phone'; return; }
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.textContent = '▶ Listen'; return; }
    const b = L.books[+btn.dataset.say], u = new SpeechSynthesisUtterance(`${b.title}, by ${b.author}. ${b.summary}`);
    u.onend = () => btn.textContent = '▶ Listen'; speechSynthesis.speak(u); btn.textContent = '■ Stop';
  });
}

// ---------- Me ----------
async function me() {
  const chart = ls.get('ksaju_chart', null), L = await lib();
  const states = [...new Set(L.states.map(s => s.state))].sort();
  V.innerHTML = `<h1 class="pg">Me</h1>
  <div class="card">${chart ? `<div class="kick">Your Day Master</div><h2>${esc(chart.dayMaster.title)} <span class="serif">${esc(chart.dayMaster.hanja)}</span></h2><a class="btn ghost sm" href="index.html#mine">Open my reading</a>`
    : `<a class="btn" href="index.html">Get my free reading</a>`}</div>
  <div class="card stack">
    ${SITE.gunghap ? '<a class="btn ghost" href="compat.html">Compatibility with someone</a>' : soon('Compatibility with someone', 'Compatibility opens after launch.')}
    ${F.fullReport && SITE.mode === 'live' ? `<a class="btn" href="index.html#mine">${esc(SITE.product.name)} · ${esc(SITE.product.price)}</a>` : soon(`Full report · ${SITE.product.price}`, 'The full report opens at launch.')}
    ${F.aiGuide ? '' : soon('Ask Haneul (AI guide)', 'The AI guide is coming soon.')}
    ${F.cloudSync ? '' : soon('Back up to my account', 'Accounts are coming soon. For now everything stays on this phone.')}
    <button class="btn ghost" id="share2" type="button">Share K-Saju</button>
  </div>
  <div class="card"><div class="kick">Help near you</div>
    <p>In a crisis call or text <a href="tel:988">988</a>. In danger call <a href="tel:911">911</a>. Food, housing and services: <a href="tel:211">211</a>.</p>
    <select id="st"><option value="">Pick your state…</option>${states.map(s => `<option>${esc(s)}</option>`).join('')}</select><div id="stout"></div></div>
  <div class="card"><button class="btn ghost sm" id="wipe" type="button">Clear my data on this phone</button></div>`;
  $('#share2').onclick = share;
  $('#st').onchange = e => { $('#stout').innerHTML = L.states.filter(s => s.state === e.target.value).map(s => `<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.resource_name)}</a></p>`).join(''); };
  $('#wipe').onclick = () => { ['ksaju_chart', 'ks_streak', 'ks_journal', 'ks_time'].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} }); me(); };
}

// ---------- share + router ----------
async function share() {
  const data = { title: 'K-Saju', text: "Koreans have a secret birth code. What's yours? Free in 30 seconds.", url: new URL('index.html', location.href).href };
  try { if (navigator.share) return await navigator.share(data); await navigator.clipboard.writeText(data.url); $('#share').textContent = 'Link copied'; } catch (_) {}
}
$('#share').onclick = share;
document.addEventListener('click', e => { const s = e.target.closest('[data-soon]'); if (s) { s.querySelector('.badge').textContent = s.dataset.soon || 'Soon'; } });
function route() {
  const [t, a] = (location.hash.slice(1) || 'today').split('/');
  document.querySelectorAll('#tabs a[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === t));
  speechSynthesis?.cancel?.(); scrollTo(0, 0);
  ({ today, library: () => library(a), books, me }[t] || today)();
}
addEventListener('hashchange', route); route();
