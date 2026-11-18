// NBA set builder on the server (no Chrome, no Google time, no Claude usage).
// Live Kalshi prices -> fresh search with Jacob's rules -> posts the best set to the bot -> bot writes it to the NBA sheet
// (Claude_Blend tab + Order_Desk rows, UNTICKED) -> phone push. It never places a bet.
// Win chances: sportsbook fair % from the Implied_Odds tab when the bot has it, else Kalshi mid. Lotto <= 15% of the set.
// Rules (11/18): all favorites win >= +$20 | exactly 1 hedge (underdog of a game we hold), <= 10% | 1 lotto (favorite + underdog)
// | lose-all <= 2% | no team > 40% | no 2-team combo > 25% | legs >= 10c | tickets >= $3 | favorite that fell 15c+ since morning is out
// | best night >= $100 (Claude_Blend B5, relaxed to 70/40 if nothing passes)
// | then an improve loop until 2 rounds in a row do not get better. Goal: best average night, ties -> more profit nights.
const fs = require('fs');
const CFG = JSON.parse(fs.readFileSync('/opt/rb/config.json', 'utf8'));   // { url, key } shared with the server browser
const NTFY = 'atlas-jacob-c2112e987573', DIR = '/opt/nba', FEE = 0.07, HAIR = 0.03, FAV_MIN = 0.60;
const ct = (f) => new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'America/Chicago' }, f)).format(new Date());
const post = async (b) => (await fetch(CFG.url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(Object.assign({ key: CFG.key }, b)), redirect: 'follow' })).json();
const push = (t, m) => fetch('https://ntfy.sh/' + NTFY, { method: 'POST', headers: { Title: t }, body: m }).catch(() => {});
let rng = Number(process.env.NBA_SEED) || 7; const rand = () => (rng = (rng * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rand() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  const cfg = await post({ rb: 'nbacfg' }); if (!cfg.ok) throw new Error('config: ' + JSON.stringify(cfg));
  const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const p = ct({ year: '2-digit', month: 'numeric', day: '2-digit' }).split('/');   // M/DD/YY
  const code = p[2] + mon[+p[0] - 1] + p[1].padStart(2, '0');                       // e.g. 26NOV18
  const j = await (await fetch('https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNBAGAME&status=open&limit=500')).json();
  const mk = {}; for (const m of j.markets || []) if (m.ticker.includes('-' + code)) { const [, ev, side] = m.ticker.split('-'); (mk[ev] = mk[ev] || {})[side] = { t: m.ticker, a: +m.yes_ask_dollars, b: +m.yes_bid_dollars, open: m.open_time }; }
  // morning prices for the 15c-drop rule
  const mf = DIR + '/morning-' + code + '.json'; let morning = {}; try { morning = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch (e) { }
  const G = [], skipped = [];
  for (const ev in mk) {
    const s = Object.keys(mk[ev]); if (s.length != 2) continue;
    const [x, y] = s, fav = mk[ev][x].a >= mk[ev][y].a ? x : y, dog = fav == x ? y : x, F = mk[ev][fav], D = mk[ev][dog];
    if (!(F.a > 0 && D.a > 0)) continue;
    if (!(fav in morning)) morning[fav] = F.a;
    if (F.a < FAV_MIN) continue;
    if ((cfg.exclude || []).includes(fav) || (cfg.exclude || []).includes(dog)) { skipped.push(fav + ' (skip list)'); continue; }
    if (morning[fav] - F.a >= 0.15) { skipped.push(fav + ' (fell ' + Math.round((morning[fav] - F.a) * 100) + 'c since morning)'); continue; }
    if (D.a < 0.10) continue;
    const fair = cfg.fair || {}, pf = fair[fav] != null ? fair[fav] : (fair[dog] != null ? 1 - fair[dog] : null);   // sportsbook fair % (Implied_Odds tab) when we have it
    G.push({ fav, dog, fa: F.a, da: D.a, pm: pf != null ? pf : (F.b > 0 ? (F.a + F.b) / 2 : F.a - 0.005), src: pf != null ? 'books' : 'kalshi', ft: F.t, dt: D.t });
  }
  fs.writeFileSync(mf, JSON.stringify(morning));
  if (G.length < 3) { await post({ rb: 'nbablend', tickets: [], summary: 'Not enough favorite games (' + G.length + ')', math: skipped.join(', ') }); return; }
  const N = G.length, TOT = cfg.total || 72, OUT = 1 << N, PR = new Float64Array(OUT);
  for (let o = 0; o < OUT; o++) { let q = 1; for (let g = 0; g < N; g++) q *= (o >> g) & 1 ? G[g].pm : 1 - G[g].pm; PR[o] = q; }
  let calc = 0, sets = 0;
  const price = (legs) => { let q = 1; for (const [g, s] of legs) q *= s ? G[g].fa : G[g].da; return Math.min(q * Math.pow(1 + HAIR, legs.length - 1), 0.99); };
  const payout = (st, legs) => { const q = price(legs); return st / (q * (1 + FEE * (1 - q))); };
  const hits = (o, legs) => legs.every(([g, s]) => ((o >> g) & 1) === s);
  function ev(T) {
    sets++; const tot = T.reduce((a, t) => a + t.st, 0), pays = T.map((t) => payout(t.st, t.legs));
    let avg = 0, lose = 0, win = 0, best = -1e9;
    for (let o = 0; o < OUT; o++) { let r = -tot; for (let i = 0; i < T.length; i++) if (hits(o, T[i].legs)) r += pays[i]; calc += T.length; avg += PR[o] * r; if (r > best) best = r; if (r <= -tot + 1e-9) lose += PR[o]; if (r > 0) win += PR[o]; }
    let allfav = -tot; T.forEach((t, i) => { if (t.legs.every(([, s]) => s === 1)) allfav += pays[i]; });
    const share = {}, two = {};
    T.forEach((t) => { t.legs.forEach(([g, s]) => { const k = s ? G[g].fav : G[g].dog; share[k] = (share[k] || 0) + t.st; }); if (t.k == 'main' && t.legs.length == 2) { const k = t.legs.map((l) => l.join(':')).sort().join('|'); two[k] = (two[k] || 0) + t.st; } });
    return { avg, lose, win, best, allfav, tot, pays, maxteam: Math.max(...Object.values(share)) / tot, max2: Math.max(0, ...Object.values(two)) / tot };
  }
  function ok(T, e) {
    const h = T.filter((t) => t.k == 'hedge'); if (h.length != 1) return false;
    const held = new Set(T.filter((t) => t.k == 'straight' || t.k == 'main').flatMap((t) => t.legs.map(([g]) => g)));
    return held.has(h[0].legs[0][0]) && h[0].st <= 0.10 * TOT && T.filter((t) => t.k == 'lotto').every((t) => t.st <= 0.15 * TOT) && T.every((t) => t.st >= 3) && e.allfav >= 20 && e.lose <= 0.02 && e.maxteam <= 0.40 && e.max2 <= 0.25 && e.tot == TOT && e.best >= MINBEST;
  }
  const better = (a, b) => !b || a.avg > b.avg + 1e-9 || (Math.abs(a.avg - b.avg) < 1e-9 && a.win > b.win);
  function randSet() {
    const T = [], fav = shuffle([...Array(N).keys()]);
    fav.slice(0, Math.floor(rand() * 4)).forEach((g) => T.push({ k: 'straight', legs: [[g, 1]], st: 0 }));
    for (let m = 1 + Math.floor(rand() * 3); m > 0; m--) T.push({ k: 'main', legs: shuffle([...Array(N).keys()]).slice(0, pick([2, 2, 3, 3, 4])).map((g) => [g, 1]), st: 0 });
    const held = [...new Set(T.flatMap((t) => t.legs.map(([g]) => g)))];
    T.push({ k: 'hedge', legs: [[pick(held), 0]], st: 3 + Math.floor(rand() * 5) });
    const [a, b] = shuffle([...Array(N).keys()]); T.push({ k: 'lotto', legs: [[a, 1], [b, 0]], st: 0 });
    const free = T.filter((t) => t.k != 'hedge'), w = free.map(() => rand() + 0.2), ws = w.reduce((x, y) => x + y, 0), left = TOT - T.find((t) => t.k == 'hedge').st;
    free.forEach((t, i) => (t.st = Math.max(3, Math.round((w[i] / ws) * left))));
    free[0].st += TOT - T.reduce((x, t) => x + t.st, 0);
    return free[0].st >= 3 ? T : null;
  }
  const clone = (T) => T.map((t) => ({ k: t.k, legs: t.legs.map((l) => [...l]), st: t.st }));
  let best = null, bestE = null, MINBEST = 0; const tries = Number(process.env.NBA_TRIES) || (N > 10 ? 8000 : 20000), TOPK = Number(process.env.NBA_TOPK) || 12;
  let pool = [];   // keep the top sets, not just one, and polish each (v2: many starting points)
  for (const target of [cfg.best || 100, 70, 40, 0]) {   // Jacob wants upside: best night at least $100, relax only if nothing passes
    MINBEST = target; pool = [];
    for (let i = 0; i < tries; i++) { const T = randSet(); if (!T) continue; const e = ev(T); if (!ok(T, e)) continue;
      pool.push([T, e]); if (pool.length > TOPK * 4) { pool.sort((a, b) => (better(a[1], b[1]) ? -1 : 1)); pool.length = TOPK; } }
    if (pool.length) break;
  }
  pool.sort((a, b) => (better(a[1], b[1]) ? -1 : 1)); pool = pool.slice(0, TOPK);
  if (pool.length) { best = pool[0][0]; bestE = pool[0][1]; }
  if (!best) { await post({ rb: 'nbablend', tickets: [], summary: 'No set passed the rules', math: sets + ' sets tried' }); await push('NBA set: none passed', 'No set passed the rules tonight. Skip or build by hand.'); return; }
  let rounds = 0, gBest = best, gE = bestE;
  for (const [T0, E0] of pool) { best = T0; bestE = E0; let bad = 0, r0 = 0;
  while (bad < 2 && r0 < 40) {
    rounds++; r0++; let imp = false;
    // add / remove a leg on mains and the lotto (2-4 legs mains, 2-3 legs lotto)
    for (let i = 0; i < best.length; i++) {
      const t = best[i];
      if ((t.k == 'main' && t.legs.length < 4) || (t.k == 'lotto' && t.legs.length < 3)) for (let g = 0; g < N; g++) {
        if (t.legs.some(([x]) => x == g)) continue; const U = clone(best); U[i].legs.push([g, 1]); const e = ev(U);
        if (ok(U, e) && better(e, bestE)) { best = U; bestE = e; imp = true; } }
      if ((t.k == 'main' && t.legs.length > 2) || (t.k == 'lotto' && t.legs.length > 2)) for (let l = 0; l < t.legs.length; l++) {
        if (t.k == 'lotto' && t.legs[l][1] === 0) continue; const U = clone(best); U[i].legs.splice(l, 1); const e = ev(U);
        if (ok(U, e) && better(e, bestE)) { best = U; bestE = e; imp = true; } }
    }
    for (let i = 0; i < best.length; i++) for (let k = 0; k < best.length; k++) for (const d of [1, 2]) {
      if (i == k) continue; const U = clone(best); U[i].st -= d; U[k].st += d; const e = ev(U);
      if (ok(U, e) && better(e, bestE) && e.lose <= bestE.lose + 1e-9) { best = U; bestE = e; imp = true; }
    }
    for (let i = 0; i < best.length; i++) for (let l = 0; l < best[i].legs.length; l++) for (let g = 0; g < N; g++) {
      if (best[i].legs.some(([x]) => x == g)) continue; const U = clone(best); U[i].legs[l][0] = g; const e = ev(U);
      if (ok(U, e) && better(e, bestE)) { best = U; bestE = e; imp = true; }
    }
    bad = imp ? 0 : bad + 1;
  }
  if (better(bestE, gE)) { gBest = best; gE = bestE; } }
  best = gBest; bestE = gE;
  const nm = (legs) => legs.map(([g, s]) => (s ? G[g].fav : G[g].dog)).join(' + ');
  const KIND = { straight: 'STRAIGHT', main: 'MAIN', hedge: 'HEDGE', lotto: 'LOTTO' };
  const tickets = best.map((t, i) => ({ name: KIND[t.k] + ': ' + nm(t.legs), stake: t.st, pays: Math.round(bestE.pays[i] * 100) / 100, legs: t.legs.map(([g, s]) => (s ? G[g].ft : G[g].dt) + ':yes').join(';') }));
  const f = (x) => (x >= 0 ? '+$' : '-$') + Math.abs(x).toFixed(2);
  const summary = 'avg ' + f(bestE.avg) + ' | lose all ' + (bestE.lose * 100).toFixed(1) + '% | all favs win ' + f(bestE.allfav) + ' | best ' + f(bestE.best) + ' | profit nights ' + Math.round(bestE.win * 100) + '% | top team ' + Math.round(bestE.maxteam * 100) + '%';
  const math = N + ' favorite games (win chances: ' + G.filter((g) => g.src == 'books').length + ' from sportsbook fair %, rest from Kalshi), ' + sets + ' sets scored, ' + calc + ' calculations, ' + rounds + ' improve rounds, best-night target $' + MINBEST + (skipped.length ? ' | skipped: ' + skipped.join(', ') : '');
  const r = await post({ rb: 'nbablend', tickets, summary, math });
  await push('NBA set ready ($' + TOT + ')', tickets.map((t) => 'put $' + t.stake + ' ' + t.name.replace(/^\w+: /, '') + ', pays $' + t.pays.toFixed(2)).join('\n') + '\n' + summary + '\n' + (r.loaded ? 'On Order_Desk, unticked.' : (r.note || 'Not loaded (Server blend OFF)')));
  console.log(summary, '|', math, '|', JSON.stringify(r));
}
main().catch(async (e) => { console.error(e); await push('NBA set builder error', String(e.message || e)); process.exit(1); });
