import { buildChart, DAY_MASTERS } from './saju.js?v=5';
import { birthForm } from './form.js?v=5';
import { encode, decode, compare } from './match.js?v=5';
import { SITE } from './config.js?v=5';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STEMS = '갑을병정무기경신임계', STEMS_H = '甲乙丙丁戊己庚辛壬癸';
const EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
$('brand').textContent = SITE.brand;

const q = new URLSearchParams(location.search);
const inviter = q.get('c') ? decode(q.get('c')) : null;
let me = null; try { me = JSON.parse(sessionStorage.getItem('ksaju_chart') || 'null'); } catch (e) { }

// Invite mode: a friend sent this link -> the visitor enters THEIR OWN birthday.
// Self mode: the visitor already has a chart -> they enter their partner's birthday.
const mode = inviter ? 'invite' : (me ? 'self' : 'none');
if (mode === 'invite') {
  const t = DAY_MASTERS[inviter.idx] ? DAY_MASTERS[inviter.idx].name : 'your friend';
  $('h1').innerHTML = `A friend who is <em>${esc(t)}</em> wants to know how you match`;
  $('lead').textContent = 'Enter your birth details to get your own free chart and see your match.';
  $('who').textContent = 'Your birth details';
} else if (mode === 'none') {
  $('lead').innerHTML = 'First get your own free chart, then come back to compare. <a href="./">Get my free chart →</a>';
  $('form').classList.add('hide');
}
const form = birthForm($('fields'), 'c_');

function side(code) { return { el: EL[STEMS.indexOf(code.dm)], db: code.db, yb: code.yb, count: code.count, idx: code.idx, hanja: STEMS_H[STEMS.indexOf(code.dm)] }; }

$('form').addEventListener('submit', e => {
  e.preventDefault(); $('err').style.display = 'none';
  let input; try { input = form.read(); } catch (x) { $('err').textContent = x.message; $('err').style.display = 'block'; return; }
  let other;
  try { other = buildChart(input); other.input.city = input.city; } catch (x) { $('err').textContent = 'Please check that date and try again.'; $('err').style.display = 'block'; return; }
  const otherCode = decode(encode(other));
  let A, B, labelA, labelB;
  if (mode === 'invite') { A = side(inviter); B = side(otherCode); labelA = 'Your friend'; labelB = 'You'; try { sessionStorage.setItem('ksaju_chart', JSON.stringify(other)); } catch (x) { } }
  else { A = side(decode(encode(me))); B = side(otherCode); labelA = 'You'; labelB = 'Them'; }
  const m = compare(A, B);
  render(A, B, labelA, labelB, m, mode === 'invite' ? other : me, mode === 'invite' ? null : other);
  track('compat');
});

function card(s, label) {
  const dm = DAY_MASTERS[s.idx];
  return `<div><div class="s">${label}</div><div class="h">${s.hanja}</div><div class="t">${esc(dm.name)}</div><div class="s">${s.el}</div></div>`;
}
function render(A, B, la, lb, m, mine, partnerFull) {
  const live = SITE.mode === 'live';
  const verdict = m.score >= 88 ? 'A rare match' : m.score >= 78 ? 'A strong match' : m.score >= 68 ? 'A good match with real chemistry' : 'Opposites that teach each other';
  $('result').innerHTML = `
  <div class="card fade" style="text-align:center">
    <div class="sec">Your saju match · 宮合</div>
    <div class="duo">${card(A, la)}<div class="x">♥</div>${card(B, lb)}</div>
    <div class="ring" style="--p:${m.score}"><div><div><b>${m.score}</b><span>out of 100</span></div></div></div>
    <h2 style="margin:6px 0 0">${verdict}</h2>
    <div class="note">${m.animals[0]} + ${m.animals[1]}</div>
  </div>
  <div class="card fade"><div class="sec">Why you click</div>${m.notes.map(n => `<div class="nt"><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div>`).join('')}</div>
  <div class="card pay fade">
    <div class="blur"><h4>Your love dynamic</h4><p>When ${esc(DAY_MASTERS[A.idx].name)} meets ${esc(DAY_MASTERS[B.idx].name)}, the first thing that shows up is...</p><h4>Where you balance each other</h4><p>Your elements suggest that in everyday life one of you tends to...</p><h4>Your best months together in 2027</h4><p>March: ... June: ... October: ...</p></div>
    <div class="lock">
      <h3>Full Compatibility Reading</h3>
      <p>Your love dynamic, how you balance each other, communication tips, and your best months together in 2027.</p>
      ${live ? `<div class="price"><b>$19.99</b></div><button class="btn" id="buy1">Unlock our compatibility</button><button class="btn ghost" id="buy2">Bundle: compatibility + 2027 Year Ahead · $29.99</button>`
      : `<p style="margin-top:8px;color:var(--gold2)">Compatibility readings open before Lunar New Year. Join the list.</p><input id="em" type="email" placeholder="your@email.com" style="margin-top:10px"><button class="btn" id="wl">Notify me</button>`}
      <div class="err" id="perr"></div><div class="ok hide" id="pok"></div>
    </div>
  </div>
  <div class="card fade" style="text-align:center">
    ${mine ? `<button class="btn" id="mine">See my full free chart</button>` : ''}
    <button class="btn ghost" id="share">Send this to them</button>
    <button class="btn ghost" id="again">Compare someone else</button>
  </div>`;
  $('result').classList.remove('hide'); $('form').classList.add('hide'); $('hero').classList.add('hide'); window.scrollTo({ top: 0, behavior: 'smooth' });
  if ($('mine')) $('mine').onclick = () => location.href = './?src=compat#mine';
  $('again').onclick = () => { $('result').classList.add('hide'); $('form').classList.remove('hide'); $('hero').classList.remove('hide'); };
  $('share').onclick = async () => {
    const url = location.href.split('?')[0] + '?src=invite&c=' + encodeURIComponent(encode(mine));
    const text = `We're a ${m.score}/100 match in Korean saju! See yours:`;
    if (navigator.share) { try { await navigator.share({ title: 'Our saju match', text, url }); return; } catch (e) { return; } }
    try { await navigator.clipboard.writeText(text + ' ' + url); $('share').textContent = 'Link copied!'; } catch (e) { prompt('Copy this link:', url); }
  };
  const perr = t => { $('perr').textContent = t; $('perr').style.display = t ? 'block' : 'none'; };
  if (live) {
    const buy = async (product, btn) => {
      perr(''); btn.disabled = true; btn.textContent = 'Opening secure checkout…';
      try {
        const r = await fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'checkout', product, chart: mine, partner: { buyer: mode === 'invite' ? 'B' : 'A', a: A, b: B, score: m.score, notes: m.notes, animals: m.animals, partnerChart: partnerFull } }) });
        const j = await r.json(); if (!j.ok || !j.url) throw new Error(j.err); track('checkout'); location.href = j.url;
      } catch (e) { perr('Checkout didn\'t open. Please try again.'); btn.disabled = false; btn.textContent = 'Try again'; }
    };
    $('buy1').onclick = () => buy('compat', $('buy1')); $('buy2').onclick = () => buy('bundle', $('buy2'));
  } else {
    $('wl').onclick = async () => {
      const em = $('em').value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return perr('Enter a valid email.');
      $('wl').disabled = true;
      try {
        if (SITE.api) { const j = await (await fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'waitlist', email: em, dm: B.el, title: DAY_MASTERS[B.idx].name, element: 'compat', src: 'compat' }) })).json(); if (!j.ok) throw 0; }
        $('pok').textContent = "You're on the list!"; $('pok').classList.remove('hide'); $('wl').classList.add('hide'); $('em').classList.add('hide');
      } catch (e) { perr('Couldn\'t save that, please try again.'); $('wl').disabled = false; }
    };
  }
}
function track(step) { if (!SITE.api) return; try { fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'event', step, src: q.get('src') || '' }), keepalive: true }); } catch (e) { } }
track('landing');
