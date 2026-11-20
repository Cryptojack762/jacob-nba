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
const api = async body => { const r = await fetch(SITE.api, { method: 'POST', body: JSON.stringify(body) }); return r.json(); };

// ---------- Good / careful day (clashes, combinations, harms + Nobleman, Peach Blossom, Travel Horse) ----------
const BR = '子丑寅卯辰巳午未申酉戌亥', ST = '甲乙丙丁戊己庚辛壬癸';
const COMBO = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const HARM = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
const PEACH = [9, 6, 3, 0], HORSE = [2, 11, 8, 5];          // by three-harmony group (branch index % 4)
const NOBLE = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [5, 3], 9: [5, 3], 7: [2, 6] };
function dayLuck(chart, tp) {
  const myB = BR.indexOf(chart?.pillars?.day?.branch?.hanja), myS = ST.indexOf(chart?.dayMaster?.hanja), t = BR.indexOf(tp.hanja[1]);
  if (myB < 0 || t < 0) return null;
  const me = ANIMALS[myB], it = ANIMALS[t];
  let tone = 'steady', head = 'Steady day', text = `Nothing special between today's ${it} and your ${me}. A normal day to keep your routine.`;
  if (COMBO[myB] === t) { tone = 'good'; head = 'Smooth day'; text = `Today's ${it} pairs with your ${me}. Good for teamwork, asking for something, and dates.`; }
  else if (myB % 4 === t % 4 && myB !== t) { tone = 'good'; head = 'Supportive day'; text = `Today's ${it} is in your ${me}'s harmony group. Plans tend to line up.`; }
  else if ((myB + 6) % 12 === t) { tone = 'care'; head = 'Go-slow day'; text = `Today's ${it} clashes with your ${me}. Tradition reads it as a day of movement: fine for change, slow down on big decisions and double-check plans.`; }
  else if (HARM[myB] === t) { tone = 'care'; head = 'Clear-words day'; text = `Today's ${it} and your ${me} are a 'harm' pair. Small misunderstandings are likely, so keep messages clear and kind.`; }
  const stars = [];
  if ((NOBLE[myS] || []).includes(t)) stars.push(['Helper day', 'Your Nobleman star is active. Ask for help; the right person tends to show up.']);
  if (PEACH[myB % 4] === t) stars.push(['Charm day', 'Your Peach Blossom star is active. Good for meeting people and being seen.']);
  if (HORSE[myB % 4] === t) stars.push(['Movement day', 'Your Travel Horse star is active. Good for errands, trips and getting things moving.']);
  return { tone, head, text, stars };
}

async function today() {
  const chart = ls.get('ksaju_chart', null), tp = todayPillar(), L = await lib();
  const n = Math.floor(Date.now() / 864e5), tip = L.tips[n % L.tips.length];
  let msg = `<div class="card"><p class="lead">Get your free reading first and Today becomes personal.</p><a class="btn" href="index.html">Get my reading</a></div>`;
  if (chart && chart.dayMaster) {
    const [t, m] = GOD[relation(chart.dayMaster.element, tp.element)];
    msg = `<div class="card el-${tp.element}"><div class="kick">${esc(chart.dayMaster.title || chart.dayMaster.label)} · ${esc(chart.dayMaster.label)}</div><h2>${t}</h2><p>${m}</p></div>`;
  }
  const L2 = chart && dayLuck(chart, tp);
  const luck = L2 ? `<div class="card luck ${L2.tone}"><div class="kick">Good day or careful day</div><h2>${L2.head}</h2><p>${L2.text}</p>${L2.stars.map(x => `<p><b>✦ ${x[0]}:</b> ${x[1]}</p>`).join('')}<div class="micro" style="text-align:left">Tradition, for reflection · <a href="#library/clashes_combos">How this works</a></div></div>` : '';
  // streak
  const st = ls.get('ks_streak', { last: null, n: 0, best: 0 }), tk = dateKey(new Date()), yk = dateKey(new Date(Date.now() - 864e5));
  const done = st.last === tk, live = done || st.last === yk ? st.n : 0;
  const j = ls.get('ks_journal', {});
  V.innerHTML = `
  <h1 class="pg">Today <span class="serif">${tp.hanja}</span></h1>
  <p class="lead">${tp.yang ? 'Yang' : 'Yin'} ${tp.element} ${tp.animal} day</p>
  ${msg}
  ${luck}
  <div class="card"><div class="kick">Tip of the day</div><p>${esc(tip.tip_trick)}</p></div>
  <div class="card row"><div><div class="big">${live}🔥</div><div class="micro" style="text-align:left">day streak · best ${Math.max(st.best, live)}</div></div>
    <button class="btn sm" id="check" type="button" ${done ? 'disabled' : ''}>${done ? 'Checked in ✓' : 'Check in'}</button></div>
  <div class="card"><div class="kick">Journal</div><textarea id="jr" rows="4" placeholder="One line about today…">${esc(j[tk] || '')}</textarea>
    <button class="btn ghost sm" id="jsave" type="button">Save</button> <span class="micro" id="jmsg"></span></div>
  <div class="card"><div class="kick">Daily reading time</div>
    <div class="row"><input type="time" id="rt" value="${esc(ls.get('ks_time', '08:00'))}"><span class="micro" id="rtmsg"></span></div>
    ${F.dailyEmail ? `<div class="row" style="margin-top:10px"><input type="email" id="dem" placeholder="you@email.com" value="${esc(ls.get('ks_email', ''))}" style="flex:1;min-width:180px"><button class="btn sm" id="dsub" type="button" style="margin-top:0">Email it to me daily</button></div><div class="micro" style="text-align:left" id="dmsg">Free. One short email a day at your time. Unsubscribe anytime.</div>` : ''}
    ${F.dailyPush ? '' : soon('Send it to my phone', 'Daily phone reminders are coming soon.')}</div>`;
  $('#check').onclick = () => { const n2 = (st.last === yk ? st.n : 0) + 1; ls.set('ks_streak', { last: tk, n: n2, best: Math.max(st.best, n2) }); today(); };
  $('#jsave').onclick = () => { j[tk] = $('#jr').value.trim(); ls.set('ks_journal', j); $('#jmsg').textContent = 'Saved on this phone'; };
  $('#rt').onchange = e => { ls.set('ks_time', e.target.value); $('#rtmsg').textContent = 'Saved'; };
  const ds = $('#dsub'); if (ds) ds.onclick = async () => {
    const em = $('#dem').value.trim(), m = $('#dmsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { m.textContent = 'Please enter a real email.'; return; }
    if (!chart) { m.innerHTML = 'Get your <a href="index.html">free reading</a> first so the email is about you.'; return; }
    ds.disabled = true; m.textContent = 'Signing you up…'; ls.set('ks_email', em);
    try {
      const r = await api({ action: 'daily_signup', email: em, time: $('#rt').value || '08:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dm: { element: chart.dayMaster.element, hanja: chart.dayMaster.hanja, title: chart.dayMaster.title, label: chart.dayMaster.label }, dayBranch: chart.pillars?.day?.branch?.hanja || '' });
      m.textContent = r.ok ? 'Done! Your first email comes at your reading time.' : 'Daily emails open soon. We saved your spot on this phone.';
    } catch (_) { m.textContent = 'Daily emails open soon. We saved your spot on this phone.'; }
    ds.disabled = false;
  };
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
    <h3 class="sub">Korean culture</h3><div class="tiles">${grp('culture').map(tile).join('')}</div>
    <h3 class="sub">Wellness</h3><div class="tiles">${grp('wellness').map(tile).join('')}</div>`;
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
    <a class="btn ghost" href="compat.html">Free compatibility score ❤</a>
    <a class="btn ghost" href="#ask">Ask Haneul (first answer free)</a>
    ${F.fullReport && SITE.mode === 'live' ? `<a class="btn" href="index.html#mine">${esc(SITE.product.name)} · ${esc(SITE.product.price)}</a>` : soon(`Full report · ${SITE.product.price}`, 'The full report opens at launch.')}
    <a class="btn ghost" href="sample-report.html">See a sample report</a>
    ${F.cloudSync ? '' : soon('Back up to my account', 'Accounts are coming soon. For now everything stays on this phone.')}
    <button class="btn ghost" id="share2" type="button">Share K-Saju</button>
  </div>
  <div class="card"><div class="kick">Readings</div>
    ${(SITE.shop || []).map(p => soon(`${p.name} · ${p.price}`, p.note || 'Opens at launch.')).join('')}</div>
  <div class="card"><div class="kick">Help near you</div>
    <p>In a crisis call or text <a href="tel:988">988</a>. In danger call <a href="tel:911">911</a>. Food, housing and services: <a href="tel:211">211</a>.</p>
    <select id="st"><option value="">Pick your state…</option>${states.map(s => `<option>${esc(s)}</option>`).join('')}</select><div id="stout"></div></div>
  <div class="card"><button class="btn ghost sm" id="wipe" type="button">Clear my data on this phone</button></div>`;
  $('#share2').onclick = share;
  $('#st').onchange = e => { $('#stout').innerHTML = L.states.filter(s => s.state === e.target.value).map(s => `<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.resource_name)}</a></p>`).join(''); };
  $('#wipe').onclick = () => { ['ksaju_chart', 'ks_streak', 'ks_journal', 'ks_time', 'ks_chat', 'ks_email'].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} }); me(); };
}

// ---------- Ask Haneul (AI guide). First answer free; more answers come with credits at launch. ----------
async function ask() {
  const chart = ls.get('ksaju_chart', null), log = ls.get('ks_chat', []);
  const used = log.filter(m => m.who === 'h').length, free = SITE.chatFree ?? 1;
  V.innerHTML = `<a class="back" href="#me">← Me</a><h1 class="pg">Ask Haneul</h1>
    <p class="lead">Ask about your chart: love, work, money, timing. Haneul answers from your own four pillars.</p>
    ${chart ? '' : '<div class="card"><a class="btn" href="index.html">Get my free reading first</a></div>'}
    <div id="chat">${log.map(m => `<div class="card ${m.who === 'h' ? 'h' : 'u'}"><div class="kick">${m.who === 'h' ? 'Haneul' : 'You'}</div><p>${esc(m.t).replace(/\n/g, '<br>')}</p></div>`).join('')}</div>
    <div class="card"><textarea id="q" rows="3" placeholder="What do you want to ask?" ${chart ? '' : 'disabled'}></textarea>
    <button class="btn" id="send" type="button" ${chart ? '' : 'disabled'}>${used < free ? 'Ask (free)' : 'Ask'}</button>
    <div class="micro" id="amsg">${used < free ? `${free - used} free answer left` : 'Your free answer is used. More answers open at launch.'}</div></div>
    <p class="micro">For reflection and entertainment. Not medical, legal, financial or mental health advice.</p>`;
  const send = $('#send'); if (!send) return;
  send.onclick = async () => {
    const q = $('#q').value.trim(), m = $('#amsg'); if (!q) return;
    if (/suicid|kill (my ?self|me)|want to die|self.?harm|hurt (my ?self|me)|overdos|not safe|being (abused|hurt)/i.test(q)) {
      m.innerHTML = 'Please call or text <a href="tel:988">988</a> now, or <a href="tel:911">911</a> if you are in danger. You matter.'; return; }
    if (used >= free && !F.chatCredits) { m.textContent = 'Your free answer is used. More answers open at launch.'; return; }
    send.disabled = true; m.textContent = 'Haneul is reading your chart…';
    try {
      const r = await api({ action: 'ask', question: q.slice(0, 600), chart, history: log.slice(-6), device: deviceId() });
      if (!r.ok) throw new Error(r.err || 'x');
      log.push({ who: 'u', t: q }, { who: 'h', t: r.answer }); ls.set('ks_chat', log); ask();
    } catch (_) { m.textContent = 'Haneul is getting ready. Ask again soon.'; send.disabled = false; }
  };
}
function deviceId() { let d = ls.get('ks_dev', ''); if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set('ks_dev', d); } return d; }

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
  ({ today, library: () => library(a), books, me, ask }[t] || today)();
}
addEventListener('hashchange', route); route();
