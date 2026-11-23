// Gunghap page. Follows 2026-11-17_gunghap-spec-v2: invite link is the main path, direct entry is the smaller link.
import { buildChart, DAY_MASTERS } from './saju.js?v=8';
import { birthForm } from './form.js?v=9';
import { encode, decode, compare, side } from './match.js?v=8';
import { SITE } from './config.js?v=8';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('brand').textContent = SITE.brand;

const q = new URLSearchParams(location.search);
const inviter = q.get('c') ? decode(q.get('c')) : null;
let me = null; try { me = JSON.parse(sessionStorage.getItem('ksaju_chart') || 'null'); } catch (e) { }
let KIND = 'couple';

// invite: a friend sent this link, the visitor enters THEIR OWN birthday.
// self: the visitor has a chart; main button = send invite, smaller link = enter the other person's birthday.
const mode = inviter ? 'invite' : (me ? 'self' : 'none');
const inviteUrl = c => location.href.split('?')[0] + '?src=invite&c=' + encodeURIComponent(encode(c));
async function shareLink(url, text, btn) {
  if (navigator.share) { try { await navigator.share({ title: 'Korean saju match', text, url }); return; } catch (e) { return; } }
  try { await navigator.clipboard.writeText(text + ' ' + url); btn.textContent = 'Link copied!'; } catch (e) { prompt('Copy this link:', url); }
}
if (mode === 'invite') {
  const t = DAY_MASTERS[side(inviter).idx].name;
  $('h1').innerHTML = `A friend who is <em>${esc(t)}</em> wants to know how you match`;
  $('lead').textContent = 'Enter your birth details to get your own free chart and see your match.';
  $('who').textContent = 'Your birth details';
  $('kind').classList.add('hide');
} else if (mode === 'self') {
  $('form').classList.add('hide'); $('start').classList.remove('hide');
  $('sendInvite').onclick = () => { track('invite'); shareLink(inviteUrl(me), `I'm ${me.dayMaster.title} (${me.dayMaster.hanja}) in Korean saju. Get your free chart and see how we match:`, $('sendInvite')); };
  $('direct').onclick = e => { e.preventDefault(); $('start').classList.add('hide'); $('form').classList.remove('hide'); };
} else {
  $('lead').innerHTML = 'First get your own free chart, then come back to compare. <a href="./">Get my free chart →</a>';
  $('form').classList.add('hide');
}
document.querySelectorAll('#kind button').forEach(b => b.onclick = () => { document.querySelectorAll('#kind button').forEach(x => x.classList.toggle('on', x === b)); KIND = b.dataset.k; });
const form = birthForm($('fields'), 'c_');

$('form').addEventListener('submit', e => {
  e.preventDefault(); $('err').style.display = 'none';
  let input; try { input = form.read(); } catch (x) { $('err').textContent = x.message; $('err').style.display = 'block'; return; }
  let other;
  try { other = buildChart(input); other.input.city = input.city; } catch (x) { $('err').textContent = 'Please check that date and try again.'; $('err').style.display = 'block'; return; }
  const oc = decode(encode(other));
  let A, B, lb;
  if (mode === 'invite') { A = side(oc); B = side(inviter); lb = 'Your friend'; try { sessionStorage.setItem('ksaju_chart', JSON.stringify(other)); } catch (x) { } }
  else { A = side(decode(encode(me))); B = side(oc); lb = 'Them'; }
  render(A, B, lb, compare(A, B), mode === 'invite' ? other : me);
  track('compat');
});

function card(s, label) { return `<div><div class="s">${label}</div><div class="h">${s.hanja}</div><div class="t">${esc(DAY_MASTERS[s.idx].name)}</div><div class="s">${s.yang ? 'Yang' : 'Yin'} ${s.el}</div></div>`; }
const SECTIONS = ['Your two energies', 'What pulls you together', 'Where you rub', 'What you give each other', 'Your 2027 together', 'How to make it work'];

function render(A, B, lb, m, mine) {
  const live = SITE.mode === 'live', friend = KIND === 'friend';
  const tip = m.level === 'Challenging' && m.advice[0] ? `<div class="nt"><b>One free tip · ${esc(m.advice[0].title)}</b><span>${esc(m.advice[0].tip)}</span></div>` : '';
  const levelLine = { 'Easy Flow': 'You fit naturally.', 'Balanced': 'Real strengths and real friction.', 'Challenging': 'This match takes work.' }[m.level];
  $('result').innerHTML = `
  <div class="card fade" style="text-align:center">
    <div class="sec">Your saju match · 궁합</div>
    <div class="duo">${card(A, 'You')}<div class="x">${friend ? '×' : '♥'}</div>${card(B, lb)}</div>
    <h2 style="margin:14px 0 0">${esc(m.headline)}</h2>
    <div class="ring" style="--p:${m.score * 10}"><div><div><b>${m.score}</b><span>out of 10</span></div></div></div>
    <div class="lab" style="color:var(--gold2);font-weight:800;font-size:18px">${esc(m.pairType)}</div>
    <div class="note" style="font-size:14px;color:var(--mut)">${esc(m.level)} · ${esc(levelLine)}</div>
    <p style="color:#dcdbe8;margin:10px 0 0">${esc(m.line)}</p>
    ${m.facts.birth_time_unknown ? '<div class="note">One birth time is unknown, so this match is read without the hour pillar.</div>' : ''}
  </div>
  ${tip ? `<div class="card fade">${tip}</div>` : ''}
  <div class="card pay fade">
    <div class="blur">${SECTIONS.map(s => `<h4>${s}</h4><p>${friend ? 'As friends, your charts show that' : 'Together, your charts show that'} the first thing people notice about you two is...</p>`).join('')}</div>
    <div class="lock" style="background:linear-gradient(180deg,#1b203800 0%,#1b2038f2 30%,#1b2038 55%)">
      <h3>Full Compatibility Reading</h3>
      <p style="margin-bottom:6px">${SECTIONS.map((s, i) => `${i + 1}. ${s}`).join(' · ')}</p>
      ${live ? `<div class="price"><b>$19.99</b></div><button class="btn" id="buy1">Unlock our reading</button><button class="btn ghost" id="buy2">With my 2027 Year Ahead · $29.99</button>`
      : `<p style="margin-top:8px;color:var(--gold2)">Compatibility readings open before Lunar New Year. Join the list.</p><input id="em" type="email" placeholder="your@email.com" style="margin-top:10px"><button class="btn" id="wl">Notify me</button>`}
      <div class="err" id="perr"></div><div class="ok hide" id="pok"></div>
      <div class="note">The paid reading is for the buyer. The other person sees this free preview and can unlock their own copy.</div>
    </div>
  </div>
  <div class="card fade" style="text-align:center">
    ${mine ? `<button class="btn" id="mine">See my full free chart</button>` : ''}
    <button class="btn ghost" id="share">Share our match</button>
    <button class="btn ghost" id="again">Compare with someone else</button>
  </div>`;
  $('result').classList.remove('hide'); $('form').classList.add('hide'); $('hero').classList.add('hide'); window.scrollTo({ top: 0, behavior: 'smooth' });
  if ($('mine')) $('mine').onclick = () => location.href = './?src=compat#mine';
  $('again').onclick = () => location.href = location.pathname + '?src=self';
  $('share').onclick = () => shareLink(inviteUrl(mine), `We're a ${m.score}/10 ${m.pairType} in Korean saju (${A.hanja} × ${B.hanja}). What's your match?`, $('share'));
  const perr = t => { $('perr').textContent = t; $('perr').style.display = t ? 'block' : 'none'; };
  if (live) {
    const buy = async (product, btn) => {
      perr(''); btn.disabled = true; btn.textContent = 'Opening secure checkout…';
      try {
        const r = await fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'checkout', product, chart: mine, partner: { kind: KIND, facts: m.facts, strengths: m.strengths, advice: m.advice, a_el: A.el, b_el: B.el } }) });
        const j = await r.json(); if (!j.ok || !j.url) throw new Error(j.err); track('checkout'); location.href = j.url;
      } catch (e) { perr('Checkout didn\'t open. Please try again.'); btn.disabled = false; btn.textContent = 'Try again'; }
    };
    $('buy1').onclick = () => buy('compat', $('buy1')); $('buy2').onclick = () => buy('bundle', $('buy2'));
  } else {
    $('wl').onclick = async () => {
      const em = $('em').value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return perr('Enter a valid email.');
      $('wl').disabled = true;
      try {
        // Only the signer's own email + pair type is saved. The other person's data is never stored for marketing.
        if (SITE.api) { const j = await (await fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'waitlist', email: em, dm: A.el, title: DAY_MASTERS[A.idx].name, element: 'compat ' + m.pairType, src: 'compat' }) })).json(); if (!j.ok) throw 0; }
        $('pok').textContent = "You're on the list!"; $('pok').classList.remove('hide'); $('wl').classList.add('hide'); $('em').classList.add('hide');
      } catch (e) { perr('Couldn\'t save that, please try again.'); $('wl').disabled = false; }
    };
  }
}
function track(step) { if (!SITE.api) return; try { fetch(SITE.api, { method: 'POST', body: JSON.stringify({ action: 'event', step, src: q.get('src') || '' }), keepalive: true }); } catch (e) { } }
track('landing');
