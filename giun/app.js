// Giun (기운) — a calm daily ritual built on the K-Saju engine and library.
// Shares the chart engine (../ksaju/js/saju.js), library (../ksaju/lib) and backend (SITE.api) with K-Saju.
import { SITE } from '../ksaju/js/config.js?v=10';
import { findCities } from '../ksaju/js/geo.js?v=1';

// Shared by two apps: Giun (/giun/) and K-Saju's hub (/ksaju/hub.html). Each page sets window.APP_CFG before loading this file.
const CFG = Object.assign({ brand: 'Giun', start: '#start', home: './', classic: '../ksaju/', siteUrl: 'cryptojack762.github.io/jacob-nba/giun', share: 'A calm daily ritual from your Korean birth chart. Free.', cardTag: '기운 · Giun', src: 'giun' }, window.APP_CFG || {});
const $ = s => document.querySelector(s), V = $('#view');
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
             set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
const LIB = '../ksaju/lib/';
let LIBDATA = null; const lib = async () => LIBDATA || (LIBDATA = await (await fetch(LIB + 'library.json')).json());
const api = async b => (await fetch(SITE.api, { method: 'POST', body: JSON.stringify(b) })).json();
const chart = () => ls.get('ksaju_chart', null);
const soon = (label, note) => `<button class="btn ghost block soon" type="button" data-soon="${esc(note || 'Coming soon')}">${esc(label)} <span class="tag">Soon</span></button>`;
const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- calendar math ----------
const ST = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
const STK = ['Gap', 'Eul', 'Byeong', 'Jeong', 'Mu', 'Gi', 'Gyeong', 'Sin', 'Im', 'Gye'];
const EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const AN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const ORDER = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const ELKO = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
function dayPillar(d = new Date()) {   // days since 1900-01-01 + 10, mod 60 (1900-01-01 was 甲戌)
  const days = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1900, 0, 1)) / 864e5);
  const i = ((days + 10) % 60 + 60) % 60, s = i % 10, b = i % 12;
  return { hanja: ST[s] + BR[b], s, b, el: EL[s], yang: s % 2 === 0, animal: AN[b], name: STK[s] };
}
const GOD = {
  same: ['Friend day', 'Your own element is strong. Good for teamwork and standing your ground; watch for stubbornness.'],
  output: ['Expression day', 'Your energy flows outward. Good for making, teaching, cooking and speaking up. Rest before you run dry.'],
  wealth: ['Wealth day', 'You have the upper hand on what you go after. Good for money tasks, errands and finishing. Don\'t overreach.'],
  power: ['Pressure day', 'Outside demands are stronger. Good for discipline and rules. Pick your battles and breathe.'],
  resource: ['Support day', 'Today feeds you. Good for learning, asking for help and recovering. Say yes to support.'],
};
const rel = (me, day) => ['same', 'output', 'wealth', 'power', 'resource'][(ORDER.indexOf(day) - ORDER.indexOf(me) + 5) % 5];
const COMBO = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const HARM = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
const PEACH = [9, 6, 3, 0], HORSE = [2, 11, 8, 5];
const NOBLE = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [5, 3], 9: [5, 3], 7: [2, 6] };
function luck(c, tp) {
  const myB = BR.indexOf(c?.pillars?.day?.branch?.hanja), myS = ST.indexOf(c?.dayMaster?.hanja), t = tp.b;
  if (myB < 0) return null;
  const me = AN[myB], it = AN[t];
  let tone = 'steady', head = 'Steady day', text = `Nothing special between today's ${it} and your ${me}. Keep your routine.`;
  if (COMBO[myB] === t) { tone = 'good'; head = 'Smooth day'; text = `Today's ${it} pairs with your ${me}. Good for teamwork, asking, and dates.`; }
  else if (myB % 4 === t % 4 && myB !== t) { tone = 'good'; head = 'Supportive day'; text = `Today's ${it} is in your ${me}'s harmony group. Plans tend to line up.`; }
  else if ((myB + 6) % 12 === t) { tone = 'care'; head = 'Go-slow day'; text = `Today's ${it} clashes with your ${me}. Fine for change; slow down on big decisions and double-check plans.`; }
  else if (HARM[myB] === t) { tone = 'care'; head = 'Clear-words day'; text = `Today's ${it} and your ${me} are a 'harm' pair. Keep messages clear and kind.`; }
  const stars = [];
  if ((NOBLE[myS] || []).includes(t)) stars.push(['Helper', 'Ask for help today; the right person tends to show up.']);
  if (PEACH[myB % 4] === t) stars.push(['Charm', 'Good for meeting people and being seen.']);
  if (HORSE[myB % 4] === t) stars.push(['Movement', 'Good for errands, trips and getting things moving.']);
  return { tone, head, text, stars };
}
function moon(d = new Date()) {   // synodic month from the 2000-01-06 18:14 UTC new moon
  const age = (((d.getTime() / 864e5 + 2440587.5 - 2451550.26) % 29.530588853) + 29.530588853) % 29.530588853;
  const names = [[1.84, 'New moon', 'A quiet start. Set one small intention.'], [5.53, 'Waxing crescent', 'Plant seeds. Take the first small step.'],
    [9.22, 'First quarter', 'Push through the first obstacle.'], [12.91, 'Waxing gibbous', 'Refine and keep going.'],
    [16.61, 'Full moon', 'Notice what has grown. Celebrate and release.'], [20.3, 'Waning gibbous', 'Share what you learned. Give thanks.'],
    [23.99, 'Last quarter', 'Let go of what is not working.'], [27.68, 'Waning crescent', 'Rest and reflect before the next cycle.'], [30, 'New moon', 'A quiet start. Set one small intention.']];
  const n = names.find(x => age < x[0]);
  return { age, name: n[1], note: n[2], lit: (1 - Math.cos(2 * Math.PI * age / 29.530588853)) / 2, waxing: age < 14.765 };
}
const TERMS = [[1, 5, 'Sohan', '소한', 'Minor Cold'], [1, 20, 'Daehan', '대한', 'Major Cold'], [2, 4, 'Ipchun', '입춘', 'Start of Spring'], [2, 19, 'Usu', '우수', 'Rain Water'],
  [3, 6, 'Gyeongchip', '경칩', 'Insects Awaken'], [3, 21, 'Chunbun', '춘분', 'Spring Equinox'], [4, 5, 'Cheongmyeong', '청명', 'Clear and Bright'], [4, 20, 'Gogu', '곡우', 'Grain Rain'],
  [5, 6, 'Ipha', '입하', 'Start of Summer'], [5, 21, 'Soman', '소만', 'Grain Buds'], [6, 6, 'Mangjong', '망종', 'Grain in Ear'], [6, 21, 'Haji', '하지', 'Summer Solstice'],
  [7, 7, 'Soseo', '소서', 'Minor Heat'], [7, 23, 'Daeseo', '대서', 'Major Heat'], [8, 8, 'Ipchu', '입추', 'Start of Autumn'], [8, 23, 'Cheoseo', '처서', 'End of Heat'],
  [9, 8, 'Baengno', '백로', 'White Dew'], [9, 23, 'Chubun', '추분', 'Autumn Equinox'], [10, 8, 'Hallo', '한로', 'Cold Dew'], [10, 23, 'Sanggang', '상강', 'Frost Descends'],
  [11, 7, 'Ipdong', '입동', 'Start of Winter'], [11, 22, 'Soseol', '소설', 'Minor Snow'], [12, 7, 'Daeseol', '대설', 'Major Snow'], [12, 22, 'Dongji', '동지', 'Winter Solstice']];
const TERM_NOTE = { Spring: 'Wood season: start, grow, plan.', Summer: 'Fire season: show up, connect, play.', Autumn: 'Metal season: harvest, trim, organize.', Winter: 'Water season: rest, store energy, reflect.' };
function solarTerm(d = new Date()) {
  const y = d.getFullYear(), list = [...TERMS.map(t => [new Date(y - 1, t[0] - 1, t[1]), t]), ...TERMS.map(t => [new Date(y, t[0] - 1, t[1]), t]), ...TERMS.map(t => [new Date(y + 1, t[0] - 1, t[1]), t])];
  let cur = list[0], next = list[1];
  for (let i = 0; i < list.length - 1; i++) if (list[i][0] <= d && list[i + 1][0] > d) { cur = list[i]; next = list[i + 1]; break; }
  const m = cur[1][0], season = m === 12 || m <= 1 || (m === 2 && cur[1][1] < 4) ? 'Winter' : m <= 4 || (m === 5 && cur[1][1] < 6) ? 'Spring' : m <= 7 || (m === 8 && cur[1][1] < 8) ? 'Summer' : m <= 10 || (m === 11 && cur[1][1] < 7) ? 'Autumn' : 'Winter';
  return { cur: cur[1], next: next[1], nextDate: next[0], days: Math.ceil((next[0] - d) / 864e5), season };
}

// ---------- element rituals ----------
const BREATH = { Wood: [4, 2, 6, 'Grow tall. Breathe in like a tree drawing up water.'], Fire: [4, 0, 6, 'Cool the flame. Long, slow breaths out.'],
  Earth: [4, 4, 4, 'Be the ground. Even breaths, steady as a box.'], Metal: [4, 4, 6, 'Clear and sharp. Hold, then let go of what you don\'t need.'],
  Water: [5, 0, 7, 'Flow. Let each breath out run longer, like a river.'] };
const MED = {
  Wood: 'Sit tall, feet on the floor. Picture yourself as a young tree in early spring. With each breath in, roots reach down into cool soil. With each breath out, branches stretch a little wider. You don\'t have to grow all at once. Name one small thing you want to grow this week. Hold it gently, like a seed in your palm. Breathe in patience. Breathe out hurry. When you\'re ready, open your eyes and take one small step toward it today.',
  Fire: 'Sit comfortably and soften your shoulders. Picture a candle flame in a still room. Notice how it flickers when you breathe fast, and steadies when you breathe slow. Let your breath slow until the flame stands still. Think of someone who warms your life. Send them a quiet thank-you. Your light doesn\'t need to burn bright all day; a steady glow lasts longer. Breathe out any rush. Open your eyes when the flame feels calm.',
  Earth: 'Feel the weight of your body on the chair or floor. Let the ground hold you; you don\'t have to hold yourself up right now. Picture a wide field after harvest, quiet and warm. Breathe in for four, hold for four, out for four. Ask yourself: what do I need to feel steady today? Maybe food, rest, or one honest talk. Make a small promise to give yourself that. Rest here for three more breaths, then return.',
  Metal: 'Sit upright, like a temple bell. Breathe in through your nose and notice the cool air. Picture an autumn morning, crisp and clear. Think of one thing you are carrying that you no longer need: a worry, a grudge, a chore you can drop. On your next breath out, let it fall like a leaf. Feel the space it leaves. Clear, clean, ready. Ring your inner bell once, and come back.',
  Water: 'Lie or sit back and let your body be heavy. Picture a calm lake at night under the moon. Each breath out is a little longer than the breath in, like a wave sliding back to the shore. Thoughts may ripple across the surface; let them pass. You are the deep, still water underneath. Rest here. Nothing to fix, nothing to chase. When you\'re ready, wiggle your fingers and carry this stillness with you.' };
const EL_WORD = { Wood: 'growth', Fire: 'warmth', Earth: 'steadiness', Metal: 'clarity', Water: 'rest' };

// ---------- shared bits ----------
function setTheme(el) { document.body.dataset.el = el; }
function moonSvg(m) {   // lit side = accent; a paper-colored disc slides across to make the shadow
  const r = 30, dx = (m.waxing ? -1 : 1) * 2 * r * m.lit;
  return `<svg class="moon" viewBox="-32 -32 64 64" role="img" aria-label="${esc(m.name)}"><defs><clipPath id="mc"><circle r="${r}"/></clipPath></defs>
    <g clip-path="url(#mc)"><circle r="${r}" fill="var(--accent)"/><circle cx="${dx.toFixed(1)}" r="${r}" fill="var(--paper2)"/></g><circle r="${r}" fill="none" stroke="var(--line)"/></svg>`;
}
function say(text, btn) {
  if (!('speechSynthesis' in window)) { if (btn) btn.textContent = 'No voice on this phone'; return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); if (btn) btn.textContent = '▶ Listen'; return; }
  const u = new SpeechSynthesisUtterance(text); u.rate = .9; u.onend = () => { if (btn) btn.textContent = '▶ Listen'; };
  speechSynthesis.speak(u); if (btn) btn.textContent = '■ Stop';
}
function needChart() {
  return `<div class="card acc ink"><div class="kick">Start here</div><h2>Find your Korean birth energy</h2>
    <p>Your birth date and time make your saju, the four pillars. ${CFG.brand} turns it into a calm ritual for each day.</p>
    <a class="btn block" href="${CFG.start}">Make my chart (free, 30 seconds)</a></div>`;
}
function streak() {
  const st = ls.get('ks_streak', { last: null, n: 0, best: 0 }), t = dkey(new Date()), y = dkey(new Date(Date.now() - 864e5));
  return { st, t, y, done: st.last === t, live: st.last === t || st.last === y ? st.n : 0 };
}
function checkIn() { const s = streak(); if (s.done) return; const n = (s.st.last === s.y ? s.st.n : 0) + 1; ls.set('ks_streak', { last: s.t, n, best: Math.max(s.st.best || 0, n) }); }

// ---------- TODAY ----------
const DO = {
  same: [['Team up with a friend or coworker', 'Stand by a decision you already made', 'Move your body hard'], ['Arguing just to win', 'Lending money on impulse']],
  output: [['Make, cook or create something', 'Teach or explain what you know', 'Share your work'], ['Over-promising', 'Skipping rest']],
  wealth: [['Pay a bill or check your budget', 'Finish your errand list', 'Ask for what you\'re owed'], ['Risky bets', 'Taking on too much at once']],
  power: [['Follow the plan', 'Hit deadlines early', 'Keep promises small and exact'], ['Fighting with bosses or rules', 'Late nights']],
  resource: [['Read or learn something', 'Ask for help', 'Nap or rest'], ['Saying yes to everything', 'Comparing yourself']] };
const LUCKY = { Wood: ['green', 'east'], Fire: ['red', 'south'], Earth: ['yellow or brown', 'the center of a room'], Metal: ['white or gold', 'west'], Water: ['black or navy', 'north'] };
const hourLabel = b => { const h = (2 * b + 23) % 24, f = x => { const p = x >= 12 ? 'PM' : 'AM', y = x % 12 || 12; return y + ' ' + p; }; return `${f(h)}–${f((h + 2) % 24)}`; };
function hours(c) {
  const myB = BR.indexOf(c?.pillars?.day?.branch?.hanja); if (myB < 0) return null;
  const good = [], bad = [];
  for (let b = 0; b < 12; b++) { if (COMBO[myB] === b || (myB % 4 === b % 4 && myB !== b)) good.push(b); if ((myB + 6) % 12 === b) bad.push(b); }
  const awake = b => { const h = (2 * b + 23) % 24; return h >= 5 && h <= 21; };
  return { good: good.filter(awake).map(b => `${hourLabel(b)} (${AN[b]})`), bad: bad.map(b => `${hourLabel(b)} (${AN[b]})`) };
}
async function today() {
  const c = chart(), tp = dayPillar(), m = moon(), term = solarTerm(), L = await lib(), now = new Date();
  setTheme(tp.el);
  const tip = L.tips[Math.floor(Date.now() / 864e5) % L.tips.length];
  const s = streak(), evening = now.getHours() >= 17, tk = dkey(now), intents = ls.get('g_intent', {});
  let msg = needChart(), lk = '', plan = '', week = '';
  if (c && c.dayMaster) {
    const r = rel(c.dayMaster.element, tp.el), [h, t] = GOD[r], l = luck(c, tp), hr = hours(c);
    const res = ORDER[(ORDER.indexOf(c.dayMaster.element) + 4) % 5], [col, dir] = LUCKY[res];
    msg = `<div class="card acc frame ink"><div class="kick">${esc(c.dayMaster.title)} · ${esc(c.dayMaster.label)}</div><h2>${h}</h2><p>${t}</p>
      <div class="dolist"><div><div class="kick">Do</div>${DO[r][0].map(x => `<p>✓ ${x}</p>`).join('')}</div><div><div class="kick">Avoid</div>${DO[r][1].map(x => `<p>✕ ${x}</p>`).join('')}</div></div></div>`;
    if (l) lk = `<div class="card frame ink tone-${l.tone}"><div class="kick">Good day or careful day</div>
      <h2>${l.head}</h2><p>${l.text}</p>${l.stars.map(x => `<p>✦ <b>${x[0]} day.</b> ${x[1]}</p>`).join('')}</div>`;
    plan = `<div class="card frame ink"><div class="kick">Your plan for today</div>
      ${hr ? `<p><b>Best hours:</b> ${hr.good.join(' · ') || 'any time'}</p><p><b>Go slow:</b> ${hr.bad.join(' · ')}</p>` : ''}
      <p><b>Helpful color:</b> ${col} · <b>Face:</b> ${dir}<br><span class="muted">From ${res}, the element that feeds your ${c.dayMaster.element}. Tradition, for fun.</span></p></div>`;
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() + i); const p = dayPillar(d), x = luck(c, p);
      return `<a class="wd ${x?.tone || ''}" href="#calendar"><span>${i ? d.toLocaleDateString(undefined, { weekday: 'short' }) : 'Today'}</span><b>${p.hanja}</b><i>${x?.tone === 'good' ? '◎' : x?.tone === 'care' ? '△' : '·'}</i></a>`; }).join('');
    week = `<div class="card ink"><div class="kick">Your week</div><div class="week">${days}</div><p class="muted" style="margin-top:8px">◎ smooth · △ go slow · tap for 5 weeks</p></div>`;
  }
  const ipchun = new Date(2027, 1, 4), toGoat = Math.ceil((ipchun - now) / 864e5);
  V.innerHTML = `
  <section class="hero today ink"><div class="seal-lg" aria-hidden="true">${tp.hanja}</div><div><div class="date">${now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
    <h1>${tp.yang ? 'Yang' : 'Yin'} ${tp.el} ${tp.animal}</h1><p>${tp.name}-${AN[tp.b]} day · word for today: <b>${EL_WORD[tp.el]}</b></p></div></section>
  ${msg}${lk}${plan}
  ${c && c.dayMaster ? (() => { const miss = (c.elements?.missing || [])[0], el = miss || ORDER[(ORDER.indexOf(c.dayMaster.element) + 4) % 5], e = EMO[el];
    return `<div class="card frame ink"><div class="kick">Crystal of the week · tradition</div><div class="row" style="flex-wrap:nowrap;gap:14px"><span class="glyph" style="background:color-mix(in srgb,var(--${el}) 22%,var(--card));color:var(--${el})">玉</span>
      <div><b>${e.crystal[0]}</b> <span class="muted">· ${el}</span><p style="margin:2px 0 0">${miss ? `Your chart is light on ${el}, linked with ${e.feel}.` : `${el} feeds your ${c.dayMaster.element}.`} Keep a ${e.crystal[1]} stone where you'll see it as your reminder: ${e.tool.split('.')[0].toLowerCase()}.</p>
      <a class="muted" href="#library/crystals">What's true about crystals →</a></div></div></div>`; })() : ''}
  <a class="tile ink" href="#ask/mind" style="min-height:0;margin:14px 0;border-left:5px solid var(--accent)"><span class="glyph">心</span><b>Something on your heart?</b><span>Talk it through: today's energy + real psychology</span></a>
  <div class="card frame ink"><div class="kick">${evening ? 'Evening' : 'Morning'} ritual</div>
    ${evening ? '<h2>Close the day</h2><p>Write three small things you\'re grateful for, then one slow breath.</p>'
      : `<h2>Set today's intention</h2><input id="intent" placeholder="Today I will…" value="${esc(intents[tk] || '')}"><p class="muted" id="imsg" style="margin-top:6px">${intents[tk] ? 'Saved ✓' : 'One line. It shows up in your evening journal.'}</p>`}
    <div class="row"><a class="btn" href="#ritual/${evening ? 'evening' : 'breathe'}">${evening ? 'Open journal' : 'Breathe · 2 min'}</a>
    <span class="streak">${s.live}<small>day streak</small></span></div></div>
  ${week}
  <div class="grid2 ink"><div class="card mini"><div class="row" style="flex-wrap:nowrap;gap:12px">${moonSvg(m)}<div><div class="kick">Moon</div><b>${m.name}</b><p class="muted" style="margin:2px 0 0">${Math.round(m.lit * 100)}% lit</p></div></div><p class="muted">${m.note}</p></div>
    <div class="card mini"><div class="kick">Solar term</div><div class="brush" style="font-size:34px;line-height:1">${term.cur[3]}</div><b>${term.cur[4]}</b><p class="muted">${TERM_NOTE[term.season]}</p></div></div>
  <div class="card ink"><p class="muted" style="margin:0">Next solar term: <b>${term.next[4]}</b> in about ${term.days} day${term.days === 1 ? '' : 's'}.${toGoat > 0 ? ` The Fire Goat year 丁未 begins in about <b>${toGoat} days</b>.` : ''}</p></div>
  <div class="card frame ink"><div class="kick">Small practice</div><p>${esc(tip.tip_trick)}</p></div>`;
  const it = $('#intent'); if (it) it.onchange = () => { intents[tk] = it.value.trim(); ls.set('g_intent', intents); $('#imsg').textContent = 'Saved ✓'; };
}

// ---------- RITUAL ----------
let breathTimer = null;
function ritual(sub) {
  const c = chart(), myEl = c?.dayMaster?.element || dayPillar().el;
  setTheme(myEl); clearTimeout(breathTimer);
  if (sub === 'breathe') return breathe(myEl);
  if (sub === 'meditate') return meditate(myEl);
  if (sub === 'evening') return evening();
  if (sub === 'sounds') return sounds();
  V.innerHTML = `<section class="hero ink"><div class="date">Ritual</div><h1>息</h1><p>Breath, stillness and gratitude, matched to your ${myEl} energy.</p></section>
  <div class="grid2 ink">
    <a class="tile" href="#ritual/breathe"><span class="glyph">息</span><b>Breathe</b><span>2 minutes · ${myEl} rhythm</span></a>
    <a class="tile" href="#ritual/meditate"><span class="glyph">禪</span><b>Meditate</b><span>Your ${myEl} meditation</span></a>
    <a class="tile" href="#ritual/evening"><span class="glyph">夜</span><b>Evening journal</b><span>3 thank-yous</span></a>
    <a class="tile" href="#ritual/sounds"><span class="glyph">聲</span><b>Sounds</b><span>Rain, stream, temple bell</span></a>
  </div>
  <div class="card frame ink"><div class="kick">All five meditations</div><div class="els">${ORDER.map(e => `<a class="elchip" style="--c:var(--${e})" href="#ritual/meditate" data-el="${e}"><b>${ELKO[e]}</b><span>${e}</span><small>${EL_WORD[e]}</small></a>`).join('')}</div></div>
  <div class="card ink"><div class="kick">Daily reminder</div><p>Add a daily ritual reminder to your phone's calendar. Works today, no sign-up.</p>
    <div class="row"><input id="rtime" type="time" value="${esc(ls.get('ks_time', '08:00'))}" style="width:140px"><button class="btn" id="rics" type="button">Add to my calendar</button></div></div>`;
  V.querySelectorAll('[data-el]').forEach(a => a.onclick = () => ls.set('g_med', a.dataset.el));
  $('#rics').onclick = () => { ls.set('ks_time', $('#rtime').value || '08:00'); ics($('#rtime').value || '08:00'); };
}
function ics(time) {   // daily repeating calendar reminder, made on the phone (no server needed)
  const [h, mi] = time.split(':'), d = new Date(); d.setDate(d.getDate() + 1);
  const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${h}${mi}00`;
  const url = new URL('./#today', location.href).href;
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Giun//Daily Ritual//EN', 'BEGIN:VEVENT', `UID:giun-daily-${Date.now()}@giun`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${ds}`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY', `SUMMARY:${CFG.brand} · your daily ritual`, `DESCRIPTION:Breathe\, read today's energy and set an intention. ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${CFG.brand} · your daily ritual`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'giun-daily-ritual.ics'; a.click();
}
function breathe(el) {
  const [i, h, o, cue] = BREATH[el], total = 8;
  V.innerHTML = `<a class="back" href="#ritual">← Ritual</a><section class="hero ink"><div class="date">${el} breathing · in ${i} · ${h ? 'hold ' + h + ' · ' : ''}out ${o}</div><h1 class="brush" style="font-size:44px">${cue.split('.')[0]}.</h1><p>${cue.split('.').slice(1).join('.')}</p></section>
  <div class="card"><div class="breath"><div class="orb" id="orb">Ready</div></div><p class="muted" style="text-align:center" id="bcount">${total} breaths · stop if you feel dizzy</p>
  <button class="btn block" id="bgo" type="button">Begin</button></div>`;
  const orb = $('#orb'), go = $('#bgo'), cnt = $('#bcount');
  go.onclick = () => {
    go.disabled = true; let n = 0;
    const cycle = () => {
      if (n >= total) { orb.textContent = 'Done'; orb.style.transform = 'scale(1)'; cnt.textContent = 'Nice. Your streak is updated.'; checkIn(); go.disabled = false; go.textContent = 'Again'; return; }
      n++; cnt.textContent = `Breath ${n} of ${total}`;
      orb.style.transitionDuration = i + 's'; orb.style.transform = 'scale(1.7)'; orb.textContent = 'In';
      breathTimer = setTimeout(() => { orb.textContent = h ? 'Hold' : 'Out';
        breathTimer = setTimeout(() => { orb.style.transitionDuration = o + 's'; orb.style.transform = 'scale(1)'; orb.textContent = 'Out';
          breathTimer = setTimeout(cycle, o * 1000); }, h * 1000); }, i * 1000);
    };
    cycle();
  };
}
function meditate(el) {
  const pick = ls.get('g_med', null) || el; ls.set('g_med', null); setTheme(pick);
  V.innerHTML = `<a class="back" href="#ritual">← Ritual</a><section class="hero ink"><div class="date">${pick} meditation · about 2 minutes</div><h1>${ELKO[pick]}</h1><p>${EL_WORD[pick][0].toUpperCase() + EL_WORD[pick].slice(1)}</p></section>
  <div class="card ink"><p style="font-size:18px;line-height:1.75">${MED[pick]}</p><div class="row"><button class="btn" id="say" type="button">▶ Listen</button><button class="btn ghost" id="done" type="button">I finished</button></div></div>
  <div class="card frame ink"><div class="kick">Silent timer</div><div class="seg">${[3, 5, 10, 20].map(n => `<button class="btn ghost" data-min="${n}" type="button">${n} min</button>`).join('')}</div>
  <div class="timer" id="tmr">—</div><p class="muted">A temple bell rings at the end. Keep this page open.</p></div>`;
  $('#say').onclick = e => say(MED[pick], e.currentTarget);
  $('#done').onclick = e => { checkIn(); e.currentTarget.textContent = 'Streak updated ✓'; };
  V.querySelectorAll('[data-min]').forEach(b => b.onclick = () => {
    clearInterval(medTimer); V.querySelectorAll('[data-min]').forEach(x => x.classList.toggle('on', x === b));
    let left = +b.dataset.min * 60; const show = () => { $('#tmr').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }; show();
    medTimer = setInterval(() => { left--; show(); if (left <= 0) { clearInterval(medTimer); $('#tmr').textContent = 'Done 🙏'; play('bell'); setTimeout(stopSound, 8000); checkIn(); } }, 1000);
  });
}
let medTimer = null;
function evening() {
  const j = ls.get('g_journal', {}), t = dkey(new Date()), e = j[t] || ['', '', '', ''];
  V.innerHTML = `<a class="back" href="#ritual">← Ritual</a><section class="hero ink"><div class="date">Evening journal</div><h1>夜</h1><p>Three small thank-yous and one word for tomorrow.</p></section>
  ${ls.get('g_intent', {})[t] ? `<div class="card frame ink"><div class="kick">This morning you said</div><p><i>${esc(ls.get('g_intent', {})[t])}</i></p><p class="muted">How did it go?</p></div>` : ''}
  <div class="card ink">${[1, 2, 3].map(n => `<label>Thank you for…</label><input id="g${n}" value="${esc(e[n - 1])}">`).join('')}
    <label>One word for tomorrow</label><input id="g4" value="${esc(e[3])}" placeholder="e.g. patience">
    <button class="btn block" id="jsave" type="button">Save tonight</button><p class="muted" id="jmsg">Saved only on this phone.</p></div>
  <div class="card ink"><div class="kick">Past nights</div>${Object.keys(j).sort().reverse().slice(0, 7).map(k => `<p><b>${k}</b> · ${j[k].slice(0, 3).filter(Boolean).map(esc).join(' · ')}${j[k][3] ? ` → <i>${esc(j[k][3])}</i>` : ''}</p>`).join('') || '<p class="muted">Your first entry shows up here.</p>'}</div>`;
  $('#jsave').onclick = () => { j[t] = [1, 2, 3, 4].map(n => $('#g' + n).value.trim()); ls.set('g_journal', j); checkIn(); $('#jmsg').textContent = 'Saved. Sleep well.'; };
}
let AC = null, NODES = [];
function stopSound() { NODES.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (_) {} }); NODES = []; }
function noise(ctx) { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s; }
function play(kind) {
  stopSound(); AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const ctx = AC, out = ctx.createGain(); out.gain.value = .5; out.connect(ctx.destination);
  if (kind === 'rain' || kind === 'stream') {
    const n = noise(ctx), f = ctx.createBiquadFilter(); f.type = kind === 'rain' ? 'lowpass' : 'bandpass'; f.frequency.value = kind === 'rain' ? 1200 : 600; f.Q.value = kind === 'rain' ? .4 : .8;
    n.connect(f); f.connect(out); n.start(); NODES.push(n, f, out);
    if (kind === 'stream') { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .15; lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); NODES.push(lfo); }
  } else {
    const ring = () => { [196, 392, 587.3, 784].forEach((hz, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hz; g.gain.setValueAtTime(.25 / (k + 1), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 7); o.connect(g); g.connect(out); o.start(); o.stop(ctx.currentTime + 7.2); }); };
    ring(); const iv = setInterval(ring, 9000); NODES.push({ stop: () => clearInterval(iv) }, out);
  }
}
function sounds() {
  V.innerHTML = `<a class="back" href="#ritual">← Ritual</a><section class="hero ink"><div class="date">Sounds</div><h1>聲</h1><p>Made on your phone, works offline. Good for sleep, focus or breathing.</p></section>
  <div class="card ink">${[['rain', '🌧 Soft rain'], ['stream', '🏞 Mountain stream'], ['bell', '🔔 Temple bell']].map(([k, l]) => `<button class="btn ghost block" data-snd="${k}" type="button">${l}</button>`).join('')}
  <button class="btn block" id="sstop" type="button">■ Stop</button><p class="muted">Tip: set a sleep timer on your phone; sound stops when you leave this page.</p></div>`;
  V.querySelectorAll('[data-snd]').forEach(b => b.onclick = () => play(b.dataset.snd));
  $('#sstop').onclick = stopSound;
}

// ---------- LIBRARY ----------
const H = { entries: d => d.entries.map(e => `<details class="ent"><summary>${esc(e.title)}</summary><p>${esc(e.content)}</p><p class="muted">${esc(e.label)} · ${esc(e.source)}</p></details>`).join('') };
window.KS_VIEWS = window.KS_VIEWS || {};
async function library(slug) {
  setTheme('Water');
  if (slug === 'books') return books();
  if (slug) {
    const d = await (await fetch(`${LIB}categories/${slug}/data.json`)).json();
    if (!window.KS_VIEWS[slug]) await new Promise(r => { const s = document.createElement('script'); s.src = `${LIB}categories/${slug}/view.js`; s.onload = s.onerror = r; document.head.appendChild(s); });
    V.innerHTML = `<a class="back" href="#library">← Library</a><section class="hero ink"><h1 class="brush" style="font-size:42px">${esc(d.name)}</h1></section>${(window.KS_VIEWS[slug] || H.entries)(d, H)}`;
    return;
  }
  const idx = await (await fetch(LIB + 'categories/index.json')).json(), q = ls.get('g_q', '');
  const GL = { saju_basics: '柱', five_elements: '五', ten_stems: '干', twelve_branches: '支', ten_gods: '神', luck_pillars: '運', solar_terms: '節', compatibility: '合', hidden_stems: '藏', clashes_combos: '沖', shen_sha: '星', korean_almanac: '曆', dream_dictionary: '夢', love_saju: '愛', career_money_saju: '財', k_culture_saju: '韓', korean_names: '名', korean_holidays: '節', purple_star: '紫', sleep: '眠', nutrition_herb_safety: '草', mind_body: '心', oral_health: '齒', environment_home: '家', movement: '動', stress_breathing: '息', gut_health: '腸', healthy_aging: '壽', psychology: '心', relationships_family: '和', emotions_elements: '情', korean_emotion_words: '恨', moon_truth: '月', crystals: '玉' };
  const tile = c => `<a class="tile" href="#library/${c.slug}"><span class="glyph">${GL[c.slug] || '書'}</span><b>${esc(c.name)}</b><span>${c.count} entries</span></a>`;
  const grp = (k, t) => `<h3 class="kick" style="margin:18px 0 8px">${t}</h3><div class="grid2">${idx.filter(c => c.kind === k).map(tile).join('')}</div>`;
  V.innerHTML = `<section class="hero ink"><div class="date">Library</div><h1>書</h1><p>Korean tradition, culture and plain-English wellness, every entry with its source.</p></section>
    <a class="tile ink" href="#library/books" style="min-height:0"><span class="glyph">冊</span><b>Free books you can listen to</b><span>Public-domain classics with summaries</span></a>
    <input id="lq" placeholder="Search the library…" value="${esc(q)}" style="margin-top:12px"><div id="lres"></div><div id="pick"></div>
    ${grp('tradition', 'Saju & tradition')}${grp('culture', 'Korean culture')}${grp('wellness', 'Wellness')}`;
  let all = null;
  const run = async () => {
    const term = $('#lq').value.trim().toLowerCase(); ls.set('g_q', term); const out = $('#lres');
    if (term.length < 2) { out.innerHTML = ''; return; }
    all = all || (await Promise.all(idx.map(c => fetch(`${LIB}categories/${c.slug}/data.json`).then(r => r.json())))).flatMap(d => d.entries.map(e => ({ ...e, cat: d.name })));
    const hits = all.filter(e => (e.title + ' ' + e.content).toLowerCase().includes(term)).slice(0, 12);
    out.innerHTML = hits.map(e => `<details class="ent"><summary>${esc(e.title)} <span class="muted">· ${esc(e.cat)}</span></summary><p>${esc(e.content)}</p><p class="muted">${esc(e.source)}</p></details>`).join('') || '<p class="muted">No matches yet.</p>';
  };
  let tm; $('#lq').oninput = () => { clearTimeout(tm); tm = setTimeout(run, 200); }; if (q) run();
  const pc = idx[Math.floor(Date.now() / 864e5) % idx.length];   // today's pick: one entry a day
  fetch(`${LIB}categories/${pc.slug}/data.json`).then(r => r.json()).then(d => { const e = d.entries[Math.floor(Date.now() / 864e5) % d.entries.length];
    $('#pick') && ($('#pick').innerHTML = `<div class="card frame"><div class="kick">Today's pick · ${esc(d.name)}</div><h2>${esc(e.title)}</h2><p>${esc(e.content)}</p><p class="muted">${esc(e.source)}</p></div>`); }).catch(() => {});
}
async function books() {
  const L = await lib();
  V.innerHTML = `<a class="back" href="#library">← Library</a><section class="hero ink"><h1 class="brush" style="font-size:42px">Free books</h1><p>Public-domain classics. Tap Listen to hear the summary.</p></section>` +
    L.books.map((b, i) => `<div class="card ink"><b>${esc(b.title)}</b><p class="muted">${esc(b.author)} · ${esc(b.notes || '')}</p><p>${esc(b.summary || '')}</p>
    <div class="row"><button class="btn" data-say="${i}" type="button">▶ Listen</button><a class="btn ghost" href="${esc(b.source_url)}" target="_blank" rel="noopener">Read free</a></div></div>`).join('');
  V.querySelectorAll('[data-say]').forEach(b => b.onclick = () => { const x = L.books[+b.dataset.say]; say(`${x.title}, by ${x.author}. ${x.summary}`, b); });
}

// ---------- ASK (Haneul) ----------
function ask() {
  const c = chart(), log = ls.get('ks_chat', []), used = log.filter(m => m.who === 'h').length, free = SITE.chatFree ?? 1;
  setTheme(c?.dayMaster?.element || 'Water');
  V.innerHTML = `<section class="hero ink"><div class="date">Ask</div><h1>問</h1><p>Ask Haneul about love, work, money or timing. Answers come from your own chart.</p></section>
    ${c ? '' : needChart()}
    <div id="chat">${log.map(m => `<div class="msg ${m.who === 'h' ? 'h' : 'u'}">${esc(m.t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div>`).join('')}</div>
    ${c && !log.length ? `<div class="chips">${['What is my biggest strength?', 'When is a good month for love in 2027?', 'What kind of work suits me?', 'What should I watch out for this year?'].map(x => `<button class="chip" data-q="${esc(x)}" type="button">${esc(x)}</button>`).join('')}</div>` : ''}
    <div class="card"><textarea id="q" rows="3" placeholder="What's on your mind?" ${c ? '' : 'disabled'}></textarea>
    <button class="btn block" id="send" type="button" ${c ? '' : 'disabled'}>${used < free ? 'Ask Haneul (free)' : 'Ask Haneul'}</button>
    <p class="muted" id="amsg">${used < free ? `${free > 1000 ? "Unlimited answers" : (free - used) + " free answer left"}` : 'Your free answer is used. More answers open at launch.'}</p></div>
    <a class="tile ink" href="#ask/mind" style="min-height:0;margin-bottom:12px;border-left:5px solid var(--accent)"><span class="glyph">心</span><b>Talk it through</b><span>Something on your heart? Chart energy + real psychology</span></a>
    <div class="grid2"><a class="tile" href="../ksaju/compat.html"><span class="ic">❤</span><b>Compatibility</b><span>Free score with anyone</span></a>
    <a class="tile" href="#library/love_saju"><span class="ic">💌</span><b>Love & saju</b><span>Library</span></a></div>`;
  V.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { $('#q').value = b.dataset.q; $('#q').focus(); });
  const send = $('#send'); if (!send || !c) return;
  send.onclick = async () => {
    const q = $('#q').value.trim(), m = $('#amsg'); if (!q) return;
    if (/suicid|kill (my ?self|me)|want to die|self.?harm|hurt (my ?self|me)|overdos|not safe|being (abused|hurt)/i.test(q)) { m.innerHTML = 'Please call or text <a href="tel:988">988</a> now, or <a href="tel:911">911</a> if you are in danger. You matter.'; return; }
    if (used >= free && !SITE.features?.chatCredits) { m.textContent = 'Your free answer is used. More answers open at launch.'; return; }
    send.disabled = true; m.textContent = 'Haneul is reading your chart…';
    try { const r = await api({ action: 'ask', question: q.slice(0, 600), chart: c, history: log.slice(-6), device: dev() });
      if (!r.ok) throw new Error(r.err); log.push({ who: 'u', t: q }, { who: 'h', t: r.answer }); ls.set('ks_chat', log); ask();
    } catch (e) { m.textContent = e.message === 'limit' ? 'Your free answer is used. More answers open at launch.' : 'Haneul is resting. Try again soon.'; send.disabled = false; }
  };
}
// ---------- TALK IT THROUGH: chart energy as a lens + real psychology tools ----------
// Element-emotion pairs come from traditional East Asian medicine (wu xing); the tools come from psychology research (see Library > Psychology).
const EMO = {
  Wood: { feel: 'anger and frustration', tool: 'Take a 20-minute cool-down before you answer. Your body needs that long to settle after it floods.', crystal: ['Jade', 'green'] },
  Fire: { feel: 'restlessness and overexcitement', tool: 'Ground yourself: slow breaths, feet on the floor, and an early night. Short sleep makes every feeling louder.', crystal: ['Amethyst', 'purple'] },
  Earth: { feel: 'worry and overthinking', tool: 'Check the thought: write the worry down, then the evidence for it and against it.', crystal: ['Citrine', 'golden yellow'] },
  Metal: { feel: 'grief and letting go', tool: 'Write to yourself kindly for 10 to 15 minutes about what you lost, like you would to a friend.', crystal: ['Rose quartz', 'pink'] },
  Water: { feel: 'fear and insecurity', tool: 'Slow breathing with a long exhale, then one small brave step you can do today.', crystal: ['Black tourmaline', 'black'] } };
const TROUBLE = {
  relationship: { label: 'Relationship', lib: 'relationships_family',
    tools: [['Take a real break', 'If your heart is racing, agree on a 20 to 30 minute break, then come back. (Gottman research on flooding)'],
            ['Start soft', 'Open with "I feel ___ when ___, and I need ___" instead of "you always". (Softened start-up)']],
    qs: ['Did you pause when you felt flooded, or answer right away?', 'Did you start with an "I" statement or with blame?', 'Did you tell them one thing you appreciate about them lately?'],
    step: 'Send one calm message that names your feeling and one small request.' },
  work: { label: 'Work', lib: 'psychology',
    tools: [['Catch, check, change', 'Write the stressful thought, the evidence for and against it, then a fairer version. (CBT reframing)'],
            ['Five-minute start', 'Break the task into the smallest next step and do it for five minutes. (Shaping)']],
    qs: ['Did you write the worry down, or let it loop in your head?', 'Did you separate what you control from what you don\'t?', 'Did you talk to yourself the way you\'d talk to a coworker?'],
    step: 'Pick the one task that matters most tomorrow and write its first five-minute step.' },
  family: { label: 'Family', lib: 'relationships_family',
    tools: [['Calm first, talk second', 'Your calm helps theirs. Slow your breathing before you respond. (Co-regulation)'],
            ['Ask for support', 'When family duties pile up, ask one person for one specific kind of help.']],
    qs: ['Did you give them your full attention when they were upset?', 'Did you stay calm, or match their energy?', 'Did you ask anyone for support for yourself?'],
    step: 'Choose one person to check in with this week, just to listen.' },
  money: { label: 'Money', lib: 'psychology',
    tools: [['Write it out, kindly', 'Spend 15 minutes writing about your money stress without judging yourself. (Self-compassion writing trial)'],
            ['Plan, then notice the good', 'Do one practical money task, then note three small good things from today. (Gratitude research)']],
    qs: ['Did you look at the actual numbers, or just the fear?', 'Did you remember money stress is common and not a measure of your worth?', 'Did you do one small practical step today?'],
    step: 'List your next 3 bills with dates, then pick one small cost to cut this week. For big decisions, talk to a financial counselor.' },
  self: { label: 'Me / my mood', lib: 'psychology',
    tools: [['Self-compassion break', 'Name it ("this is hard"), remember others feel this too, and put a hand on your chest and say one kind thing.'],
            ['Plan one good thing', 'Schedule one small enjoyable activity instead of waiting to feel like it. (Activity scheduling)']],
    qs: ['Did you sleep enough last night?', 'Did you treat a mistake as a mistake, or as proof something is wrong with you?', 'Did you do one thing today just because it\'s good for you?'],
    step: 'Tonight, write three small things that went okay today.' } };
const MOON_NOTE = m => m.name === 'Full moon' ? 'Full moon: many traditions treat it as a time to release and check in. Big hospital studies found no real change in behavior at the full moon, so use it as a reminder to pause, not an explanation.'
  : m.name === 'New moon' ? 'New moon: a traditional time to set a fresh intention.' : `${m.name}: ${m.note}`;
function lens(c, tp, m) {
  const out = [], r = rel(c.dayMaster.element, tp.el), l = luck(c, tp);
  out.push(`<b>${GOD[r][0]}.</b> Today's ${tp.el} meets your ${c.dayMaster.element}. ${GOD[r][1]}`);
  if (l?.tone === 'care') out.push(`<b>${l.head}.</b> ${l.text} Tradition reads friction as louder today, which is a reason to slow down, not a reason things went wrong.`);
  else if (l) out.push(`<b>${l.head}.</b> ${l.text}`);
  out.push(`<b>Today's element, ${tp.el},</b> is linked in traditional medicine with ${EMO[tp.el].feel}. If that's what you're feeling, it's a common day for it.`);
  const miss = c.elements?.missing || []; if (miss.length) out.push(`<b>Your growth edge:</b> your chart is light on ${miss.join(' and ')}, linked with ${miss.map(x => EMO[x]?.feel).filter(Boolean).join(' and ')}.`);
  out.push(MOON_NOTE(m));
  return out;
}
function mind() {
  const c = chart(); setTheme(c?.dayMaster?.element || 'Water');
  const pick = ls.get('g_trouble', 'relationship'), draft = ls.get('g_trouble_txt', '');
  V.innerHTML = `<a class="back" href="#ask">← Ask</a><section class="hero ink"><div class="date">Talk it through</div><h1 class="brush" style="font-size:46px">What's on your heart?</h1>
    <p>Your chart gives the "why today". Psychology gives the "what to do". Private, on your phone.</p></section>
    ${c ? '' : needChart()}
    <div class="card frame ink"><div class="kick">It's about…</div><div class="chips">${Object.entries(TROUBLE).map(([k, t]) => `<button class="chip ${k === pick ? 'solid' : ''}" data-t="${k}" type="button">${t.label}</button>`).join('')}</div>
      <div style="position:relative"><textarea id="tt" rows="4" placeholder="What happened? Type or tap the mic.">${esc(draft)}</textarea>
      <button class="chip" id="mic" type="button" style="position:absolute;right:8px;bottom:10px" aria-label="Speak">🎤</button></div>
      <button class="btn block" id="go" type="button" ${c ? '' : 'disabled'}>Help me see it</button><p class="muted" id="tmsg">In a crisis call or text <a href="tel:988">988</a>.</p></div>
    <div id="out"></div>`;
  V.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { ls.set('g_trouble', b.dataset.t); ls.set('g_trouble_txt', $('#tt').value); mind(); });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('#mic');
  if (!SR) mic.style.display = 'none'; else mic.onclick = () => { const r = new SR(); r.lang = 'en-US'; r.interimResults = false; mic.textContent = '…';
    r.onresult = e => { $('#tt').value = ($('#tt').value + ' ' + e.results[0][0].transcript).trim(); }; r.onend = () => { mic.textContent = '🎤'; }; r.onerror = () => { mic.textContent = '🎤'; }; r.start(); };
  $('#go').onclick = () => {
    const txt = $('#tt').value.trim(), msg = $('#tmsg'); ls.set('g_trouble_txt', txt);
    if (/suicid|kill (my ?self|me|him|her|them)|want to die|self.?harm|hurt (my ?self|me)|overdos|not safe|being (abused|hurt|hit)|he hits|she hits/i.test(txt)) {
      $('#out').innerHTML = `<div class="card acc"><h2>You deserve support right now</h2><p>Please call or text <a href="tel:988">988</a> (Suicide & Crisis Lifeline) or call <a href="tel:911">911</a> if you're in danger. For abuse: National Domestic Violence Hotline <a href="tel:18007997233">1-800-799-7233</a>.</p></div>`; return; }
    const t = TROUBLE[ls.get('g_trouble', 'relationship')], tp = dayPillar(), m = moon(), L = lens(c, tp, m), dm = EMO[c.dayMaster.element], cr = EMO[tp.el].crystal;
    $('#out').innerHTML = `
      <div class="card frame ink"><div class="kick">1 · Today's energy lens (tradition, for reflection)</div>${L.map(x => `<p>${x}</p>`).join('')}</div>
      <div class="card frame ink"><div class="kick">2 · What psychology says</div>${t.tools.map(([h, d]) => `<p><b>${h}.</b> ${d}</p>`).join('')}
        <p><b>For your ${c.dayMaster.element} nature:</b> ${dm.tool}</p><a class="muted" href="#library/${t.lib}">Read the research →</a></div>
      <div class="card frame ink"><div class="kick">3 · Ask yourself</div>${t.qs.map(q => `<label style="display:flex;gap:10px;align-items:flex-start;font-weight:400"><input type="checkbox" style="width:auto;margin-top:4px"> ${q}</label>`).join('')}</div>
      <div class="card acc frame ink"><div class="kick">4 · One small next step</div><p>${t.step}</p>
        <p class="muted">Ritual idea: hold a ${cr[1]} stone like ${cr[0].toLowerCase()} while you do it, as a reminder of your intention. Crystals are tradition; studies found the calm comes from the ritual itself. <a href="#library/crystals">Why</a></p></div>
      <button class="btn block" id="hn" type="button">Talk it through with Haneul</button><p class="muted" id="hmsg"></p><div id="hans"></div>
      <p class="muted">Not therapy. If this feels heavy for more than two weeks, a counselor can help. In a crisis call or text 988.</p>`;
    $('#hn').onclick = async () => {
      const hm = $('#hmsg'), log = ls.get('ks_chat', []), used = log.filter(x => x.who === 'h').length;
      if (!txt) { hm.textContent = 'Write a few words about what happened first.'; return; }
      if (used >= (SITE.chatFree ?? 1) && !SITE.features?.chatCredits) { hm.textContent = 'Your free Haneul answer is used. More answers open at launch.'; return; }
      $('#hn').disabled = true; hm.textContent = 'Haneul is listening…';
      const q = `[Talk it through] Topic: ${t.label}. Today: ${tp.hanja} (${tp.yang ? 'yang' : 'yin'} ${tp.el} ${tp.animal}), ${GOD[rel(c.dayMaster.element, tp.el)][0]}${luck(c, tp) ? ', ' + luck(c, tp).head : ''}, ${m.name}. What happened: ${txt}`;
      try { const r = await api({ action: 'ask', mode: 'mind', question: q.slice(0, 900), chart: c, history: [], device: dev() });
        if (!r.ok) throw new Error(r.err); log.push({ who: 'u', t: txt }, { who: 'h', t: r.answer }); ls.set('ks_chat', log);
        $('#hans').innerHTML = `<div class="msg h">${esc(r.answer).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div><button class="btn ghost" id="hsay" type="button">▶ Listen</button>`; hm.textContent = '';
        $('#hsay').onclick = e => say(r.answer.replace(/\*\*/g, ''), e.currentTarget);
      } catch (e) { hm.textContent = e.message === 'limit' ? 'Your free Haneul answer is used. More answers open at launch.' : 'Haneul is resting. Try again soon.'; $('#hn').disabled = false; }
    };
    $('#out').scrollIntoView({ behavior: 'smooth' });
  };
}
function dev() { let d = ls.get('ks_dev', ''); if (!d) { d = Math.random().toString(36).slice(2) + Date.now().toString(36); ls.set('ks_dev', d); } return d; }

// ---------- ME ----------
async function me(sub) {
  const c = chart();
  if (sub === 'chart') return reading();
  setTheme(c?.dayMaster?.element || 'Earth');
  const L = await lib(), states = [...new Set(L.states.map(s => s.state))].sort();
  V.innerHTML = `<section class="hero ink"><div class="date">Me</div><h1>我</h1></section>
  ${c ? `<div class="card acc ink"><div class="kick">${esc(c.dayMaster.label)}</div><h2>${esc(c.dayMaster.title)} <span style="font-family:'Noto Serif KR'">${esc(c.dayMaster.hanja)}</span></h2>
    <div class="row"><a class="btn" href="#me/chart">My chart</a><a class="btn ghost" href="#calendar">My good days</a><a class="btn ghost" href="#card">Share card</a></div></div>` : needChart()}
  <div class="card ink"><div class="kick">Daily message by email</div><div class="row"><input id="dem" type="email" placeholder="you@email.com" value="${esc(ls.get('ks_email', ''))}" style="flex:1;min-width:170px">
    <input id="dtime" type="time" value="${esc(ls.get('ks_time', '08:00'))}" style="width:130px"></div><button class="btn block" id="dsub" type="button">Email it to me daily</button><p class="muted" id="dmsg">Free. Unsubscribe anytime.</p>
    <button class="btn ghost block" id="mics" type="button">Or add a daily reminder to my calendar</button></div>
  <div class="card ink"><div class="kick">Readings</div><a class="btn ghost block" href="../ksaju/sample-report.html">See a sample report</a>
    ${SITE.mode === 'live' && c ? `<a class="btn block" href="../ksaju/index.html#mine">${esc(SITE.product.name)} · ${esc(SITE.product.price)}</a>` : soon(`${SITE.product.name} · ${SITE.product.price}`, 'Opens at launch.')}
    <div class="prices">${(SITE.shop || []).map(p => `<div class="price"><span>${esc(p.name)}</span><b>${esc(p.price)}</b><em>Soon</em></div>`).join('')}</div>
    ${SITE.mode === 'live' ? '' : `<div class="row" style="margin-top:12px"><input id="wem" type="email" placeholder="you@email.com" value="${esc(ls.get('ks_email', ''))}" style="flex:1;min-width:170px"><button class="btn" id="wl" type="button">Notify me at launch</button></div><p class="muted" id="wmsg">Get first access to paid readings. One email at launch.</p>`}</div>
  <div class="card frame ink"><div class="kick">Coming soon</div><div class="chips">${['Friends & compare', 'Holiday readings', 'Narrated meditations', 'Account backup', 'Phone notifications', 'Full-year calendar'].map(x => `<span class="chip soonchip">${x}</span>`).join('')}</div></div>
  <div class="card ink"><div class="kick">Help near you</div><p>In a crisis call or text <a href="tel:988">988</a>. In danger call <a href="tel:911">911</a>. Food, housing and services: <a href="tel:211">211</a>.</p>
    <select id="st"><option value="">Pick your state…</option>${states.map(s => `<option>${esc(s)}</option>`).join('')}</select><div id="stout"></div></div>
  <div class="card ink"><div class="kick">Settings</div>${CFG.themes === false ? '' : `<div class="seg">${['auto', 'light', 'dark'].map(t => `<button class="btn ghost ${ls.get('g_theme', 'auto') === t ? 'on' : ''}" data-th="${t}" type="button">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>`}
    <a class="btn ghost block" href="${CFG.start}">Change birth details</a>${CFG.classic ? `<a class="btn ghost block" href="${CFG.classic}">${CFG.classicLabel || 'Open classic K-Saju'}</a>` : ''}
    <button class="btn ghost block" id="wipe" type="button">Clear my data on this phone</button></div>`;
  $('#st').onchange = e => { $('#stout').innerHTML = L.states.filter(s => s.state === e.target.value).map(s => `<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.resource_name)}</a></p>`).join(''); };
  V.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { ls.set('g_theme', b.dataset.th); applyTheme(); me(); });
  $('#wipe').onclick = () => { if (!$('#wipe').dataset.sure) { $('#wipe').dataset.sure = 1; $('#wipe').textContent = 'Tap again to clear everything'; return; }
    ['ksaju_chart', 'ks_streak', 'ks_chat', 'ks_email', 'ks_time', 'g_journal', 'g_q'].forEach(k => { try { localStorage.removeItem(k); } catch (_) {} }); location.href = CFG.start; };
  $('#mics').onclick = () => { ls.set('ks_time', $('#dtime').value || '08:00'); ics($('#dtime').value || '08:00'); };
  const wl = $('#wl'); if (wl) wl.onclick = async () => {
    const em = $('#wem').value.trim(), msg = $('#wmsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = 'Please enter a real email.'; return; }
    wl.disabled = true; ls.set('ks_email', em);
    try { const r = await api({ action: 'waitlist', email: em, dm: c?.dayMaster?.label || '', title: c?.dayMaster?.title || '', element: c?.elements?.strongest || '', src: CFG.src });
      msg.textContent = r.ok ? (r.dup ? 'You\'re already on the list.' : 'You\'re on the list. We\'ll email you at launch.') : 'Could not add you. Try again soon.'; } catch (_) { msg.textContent = 'Could not reach the server. Try again soon.'; }
    wl.disabled = false;
  };
  $('#dsub').onclick = async () => {
    const em = $('#dem').value.trim(), msg = $('#dmsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = 'Please enter a real email.'; return; }
    if (!c) { msg.innerHTML = `<a href="${CFG.start}">Make your chart</a> first so the email is about you.`; return; }
    ls.set('ks_email', em); ls.set('ks_time', $('#dtime').value || '08:00'); msg.textContent = 'Signing you up…';
    try { const r = await api({ action: 'daily_signup', email: em, time: $('#dtime').value || '08:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dm: { element: c.dayMaster.element, hanja: c.dayMaster.hanja, title: c.dayMaster.title, label: c.dayMaster.label }, dayBranch: c.pillars?.day?.branch?.hanja || '' });
      msg.textContent = r.ok ? 'Done! Your first email arrives at your chosen time.' : 'Could not sign you up. Try again soon.'; } catch (_) { msg.textContent = 'Could not reach the server. Try again soon.'; }
  };
}
function reading() {
  const c = chart(); if (!c) { location.href = CFG.start; return; }
  setTheme(c.dayMaster.element);
  const P = c.pillars, cols = [['hour', 'Hour'], ['day', 'Day'], ['month', 'Month'], ['year', 'Year']];
  const pct = c.elements?.pct || {};
  V.innerHTML = `<a class="back" href="#me">← Me</a><section class="hero ink"><div class="date">${esc(c.dayMaster.label)} · Day Master</div><h1>${esc(c.dayMaster.title)}</h1><p>${esc(c.dayMaster.tag || '')}</p></section>
  <div class="card ink"><div class="kick">Your four pillars</div><div class="pillars">${cols.map(([k, l]) => { const p = P[k];
    return `<div class="pillar"><div class="l">${l}</div><div class="h">${p ? esc(p.hanja[0]) + '<br>' + esc(p.hanja[1]) : '?<br>?'}</div><div class="l">${p ? esc(p.stem.element) + ' · ' + esc(p.branch.animal) : 'time unknown'}</div></div>`; }).join('')}</div></div>
  <div class="card ink"><div class="kick">Five-element balance</div><div class="bars">${ORDER.map(e => `<div class="bar"><span>${ELKO[e]} ${e}</span><i><b style="width:${pct[e] || 0}%;background:var(--${e})"></b></i><span>${pct[e] || 0}%</span></div>`).join('')}</div>
    <p class="muted">Strongest: ${esc(c.elements?.strongest || '')}${c.elements?.missing?.length ? ' · Missing: ' + esc(c.elements.missing.join(', ')) + ' (check your hidden stems in the Library)' : ''}</p></div>
  <div class="row"><a class="btn" href="../ksaju/index.html#mine">Full reading</a><a class="btn ghost" href="#card">Share card</a><a class="btn ghost" href="#calendar">Good days</a></div>`;
}
function calendar() {
  const c = chart(); if (!c) { location.href = CFG.start; return; }
  setTheme(c.dayMaster.element);
  const start = new Date(); start.setDate(start.getDate() - start.getDay()); const cells = [];
  for (let i = 0; i < 35; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const l = luck(c, dayPillar(d));
    cells.push(`<div class="d ${l?.tone === 'good' ? 'good' : l?.tone === 'care' ? 'care' : ''} ${dkey(d) === dkey(new Date()) ? 'today' : ''}" title="${esc(l?.head || '')}">${d.getDate()}${l?.stars.length ? '<br>✦' : '<br>&nbsp;'}</div>`); }
  V.innerHTML = `<a class="back" href="#me">← Me</a><section class="hero ink"><div class="date">Your next 5 weeks</div><h1 class="brush" style="font-size:44px">Good days</h1><p>From your ${esc(c.pillars?.day?.branch?.animal || '')} day pillar. Tradition, for reflection.</p></section>
  <div class="card"><div class="cal">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(w => `<div class="w">${w}</div>`).join('')}${cells.join('')}</div>
  <div class="legend"><span><i style="background:var(--Wood)"></i>smooth</span><span><i style="background:var(--Earth)"></i>go slow</span><span>✦ helper, charm or movement star</span></div></div>
  ${soon('Full year calendar + lucky dates for weddings and moves', 'The full-year calendar opens with the Lucky Dates reading.')}`;
}
async function card() {
  const c = chart(); if (!c) { location.href = CFG.start; return; }
  setTheme(c.dayMaster.element);
  V.innerHTML = `<a class="back" href="#me">← Me</a><section class="hero ink"><h1 class="brush" style="font-size:44px">Your cards</h1><p>Share your Day Master, or save a lock-screen wallpaper in your element's colors.</p></section>
  <div class="card"><div class="seg"><button class="btn ghost on" data-k="post" type="button">Share card</button><button class="btn ghost" data-k="wall" type="button">Wallpaper</button></div>
  <canvas class="preview" id="cv"></canvas><div class="row" style="margin-top:10px"><button class="btn" id="cshare" type="button">Share</button><button class="btn ghost" id="csave" type="button">Save image</button></div></div>`;
  let kind = 'post';
  await document.fonts.load('80px "Nanum Brush Script"').catch(() => {}); await document.fonts.load('700 80px "Noto Serif KR"').catch(() => {});
  const draw = () => {
    const cv = $('#cv'), W = 1080, Hh = kind === 'post' ? 1350 : 2340; cv.width = W; cv.height = Hh; const g = cv.getContext('2d');
    const cs = getComputedStyle(document.body), col = cs.getPropertyValue('--' + c.dayMaster.element).trim() || '#B0832A';
    g.fillStyle = '#F3ECDF'; g.fillRect(0, 0, W, Hh);
    const cy = kind === 'post' ? 560 : 1080; g.globalAlpha = .9; g.fillStyle = col; g.beginPath(); g.arc(W / 2, cy, 330, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#F3ECDF'; g.font = '700 300px "Noto Serif KR"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.dayMaster.hanja, W / 2, cy + 10);
    g.fillStyle = '#1F1B16'; g.font = '130px "Nanum Brush Script"'; g.fillText(c.dayMaster.title, W / 2, cy + 470);
    g.font = '600 44px Inter, sans-serif'; g.fillStyle = '#4A4238'; g.fillText(`${c.dayMaster.label} · ${ELKO[c.dayMaster.element]}`, W / 2, cy + 570);
    g.font = '600 36px Inter, sans-serif'; g.fillStyle = '#7C7266';
    g.fillText(kind === 'post' ? 'My Korean birth energy · what\'s yours?' : CFG.cardTag, W / 2, Hh - (kind === 'post' ? 110 : 220));
    if (kind === 'post') { g.font = '600 30px Inter, sans-serif'; g.fillText(CFG.siteUrl, W / 2, Hh - 60); }
  };
  draw();
  V.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; V.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  const blob = () => new Promise(r => $('#cv').toBlob(r, 'image/png'));
  $('#csave').onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = `giun-${kind}.png`; a.click(); };
  $('#cshare').onclick = async () => { const f = new File([await blob()], `giun-${kind}.png`, { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'My Korean birth energy', text: 'Find yours free:', url: new URL(CFG.home, location.href).href }); else $('#csave').click(); } catch (_) {} };
}

// ---------- START (birth form) ----------
function start() {
  setTheme('Earth');
  let place = ls.get('g_place', null), gender = '';
  V.innerHTML = `<section class="hero ink"><div class="date">Your chart</div><h1 class="brush" style="font-size:46px">When were you born?</h1><p>Calculated right on your phone with Korean saju math (true solar time). Nothing is sent anywhere.</p></section>
  <div class="card ink"><label for="bd">Birth date</label><input id="bd" type="date" min="1900-01-01" max="${dkey(new Date())}">
    <label for="bt">Birth time</label><input id="bt" type="time"><label style="display:flex;gap:8px;align-items:center;font-weight:400"><input id="bu" type="checkbox" style="width:auto"> I don't know my birth time</label>
    <label for="city">Birth city</label><input id="city" autocomplete="off" placeholder="Start typing a city…" value="${esc(place?.label || '')}"><div class="sug" id="sug"></div>
    <label>Gender (used for luck cycles; optional)</label><div class="seg">${['female', 'male', 'skip'].map(g => `<button class="btn ghost" data-g="${g}" type="button">${g[0].toUpperCase() + g.slice(1)}</button>`).join('')}</div>
    <button class="btn block" id="make" type="button">Reveal my energy</button><p class="muted" id="ferr"></p></div>`;
  let list = [], tm;
  $('#city').oninput = e => { clearTimeout(tm); const q = e.target.value.trim(); place = null; if (q.length < 2) { $('#sug').style.display = 'none'; return; }
    tm = setTimeout(async () => { try { const j = { results: await findCities(q) };
      list = j.results; $('#sug').innerHTML = list.map((x, i) => `<div data-i="${i}">${esc(x.name)} <small>${esc([x.admin1, x.country].filter(Boolean).join(', '))}</small></div>`).join('') || '<div>No match, try a bigger nearby city</div>';
    } catch (_) { $('#sug').innerHTML = '<div>City search is offline. We\'ll use your phone\'s time zone.</div>'; } $('#sug').style.display = 'block'; }, 250); };
  $('#sug').onmousedown = e => { const d = e.target.closest('[data-i]'); if (!d) return; e.preventDefault(); const x = list[+d.dataset.i];
    place = { label: `${x.name}, ${x.admin1 || x.country}`, tz: x.timezone, lon: x.longitude }; $('#city').value = place.label; $('#sug').style.display = 'none'; };
  V.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { gender = b.dataset.g === 'skip' ? '' : b.dataset.g; V.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#make').onclick = async () => {
    const d = $('#bd').value, t = $('#bt').value, unk = $('#bu').checked, err = $('#ferr');
    if (!d) { err.textContent = 'Please pick your birth date.'; return; }
    if (!t && !unk) { err.textContent = 'Add your birth time, or tick "I don\'t know".'; return; }
    // Typed a city but didn't tap a suggestion: use the top match instead of silently falling back to the phone's time zone
    if (!place && $('#city').value.trim().length >= 2) {
      if (!list.length) { try { list = await findCities($('#city').value); } catch (_) {} }
      if (list.length) { const x = list[0]; place = { label: `${x.name}, ${x.admin1 || x.country}`, tz: x.timezone, lon: x.longitude }; $('#city').value = place.label; }
      else { err.textContent = 'City not found. Try just the city name (e.g. San Antonio), or a bigger nearby city.'; return; }
    }
    const [Y, M, D] = d.split('-').map(Number), [hh, mm] = (t || '').split(':');
    const tz = place?.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const { buildChart } = await import('../ksaju/js/saju.js?v=8');   // loaded only when needed, so the rest works offline
      const c = buildChart({ year: Y, month: M, day: D, hour: unk ? null : +hh, minute: unk ? 0 : +mm, tz, longitude: place?.lon ?? '', gender });
      ls.set('ksaju_chart', c); if (place) ls.set('g_place', place); location.hash = '#me/chart';
    } catch (e) { err.textContent = 'Could not calculate. Check your connection (the saju engine loads once) and try again.'; }
  };
}

// ---------- router ----------
function applyTheme() { const t = ls.get('g_theme', 'auto'); if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; }
async function share() {
  const data = { title: CFG.brand, text: CFG.share, url: new URL(CFG.home, location.href).href };
  try { if (navigator.share) return await navigator.share(data); await navigator.clipboard.writeText(data.url); $('#share').textContent = 'Link copied'; } catch (_) {}
}
$('#share').onclick = share;
document.addEventListener('click', e => { const s = e.target.closest('[data-soon]'); if (s) s.querySelector('.tag').textContent = s.dataset.soon; });
function route() {
  const [t, a] = (location.hash.slice(1) || (chart() ? 'today' : 'start')).split('/');
  if (t === 'start' && CFG.start !== '#start') { location.href = CFG.start; return; }
  document.querySelectorAll('#tabs a').forEach(x => x.classList.toggle('on', x.dataset.t === t || (t === 'calendar' || t === 'card' || t === 'start') && x.dataset.t === 'me'));
  try { speechSynthesis?.cancel(); } catch (_) {} stopSound(); clearTimeout(breathTimer); clearInterval(medTimer); scrollTo(0, 0);
  const fn = { today, ritual: () => ritual(a), library: () => library(a), ask: () => a === 'mind' ? mind() : ask(), me: () => me(a), calendar, card, start }[t] || today;
  Promise.resolve(fn()).catch(e => { V.innerHTML = `<div class="card"><p>Something didn't load. Check your connection and try again.</p><p class="muted">${esc(e.message)}</p></div>`; });
}
applyTheme(); addEventListener('hashchange', route); route();
