/**
 * Claude's Auto Trading Bot (WEEX perpetual futures) - Google Apps Script bound to the "Claude's Trading Bot" sheet.
 * Strategies, rules and backtests: claude-bot/PLAYBOOK.md. WEEX API notes: claude-bot/WEEX_API.md.
 *
 * MODES (Home tab, "Mode"):
 *   PAPER   = no keys needed. Signals are "filled" at the live price and tracked in the sheet. Default.
 *   APPROVE = every new trade is texted/emailed to Jacob with an Approve link; nothing is sent to WEEX until he taps it.
 *   AUTO    = trades are sent to WEEX the moment a signal fires.
 * Claude's notes (assist mode) go in the "Claude notes" column and NEVER change what the bot does.
 *
 * One-time setup (Jacob):
 *   1. Run setupBot() once and approve Google's permission screen.
 *   2. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone). Paste the URL on the Home tab (Web app URL).
 *   3. For APPROVE/AUTO: Project Settings > Script Properties: WEEX_KEY, WEEX_SECRET, WEEX_PASSPHRASE (key with Read + Trade only).
 *   4. Optional phone push: install the free "ntfy" app, subscribe to a private topic name, put it on the Home tab (ntfy topic).
 */

var BOT = {
  base: 'https://api-contract.weex.com',
  coins: ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC', 'BCH', 'BNB', 'TRX', 'XLM', 'NEAR', 'UNI', 'SUI', 'HYPE', 'XMR', 'ZEC'],
  fee: 0.0016,           // WEEX taker 0.08% x 2 (exchangeInfo, Nov 17 2026)
  version: 'v1.0 (Nov 17, 2026)'
};
var DEFAULTS = [
  ['Mode', 'PAPER', 'PAPER / APPROVE / AUTO. Start with PAPER for 2-4 weeks.'],
  ['Kill switch', 'OFF', 'ON = no new trades (exits still run). Turns ON by itself on the loss limits below.'],
  ['Paper start $', 200, 'Starting balance for paper mode'],
  ['Margin per trade %', 20, '% of equity used as margin on each trade'],
  ['Leverage', 2, '1-3 recommended. Max 5 accepted.'],
  ['Max open trades', 5, ''],
  ['Max drawdown % (kill)', 20, 'Kill switch turns ON if equity falls this far below its peak'],
  ['Daily loss % (kill)', 5, 'Kill switch turns ON if equity is down this much since midnight UTC'],
  ['Protective stop (ATR x)', 3, 'Exchange-side stop on every order so an outage cannot liquidate the account'],
  ['Approve window (min)', 120, 'APPROVE mode: links expire after this many minutes'],
  ['L_TPI', 'ON', 'Long: TPI Donchian 40/20 + filters (4H)'],
  ['L_ST', 'ON', 'Long: SuperTrend 30/5 flip up + BTC up (4H)'],
  ['S_FUND', 'ON', 'Short: funding top 5% of last 90 + BTC down, 72h hold'],
  ['S_BBRSI', 'ON', 'Short: close above upper BB + RSI<70, BTC down, below EMA200'],
  ['L_FUND', 'OFF', 'Long: funding bottom 5% + BTC up, 72h hold (weak extra edge)'],
  ['S_BTCFLIP', 'OFF', 'Watch list: short coins below EMA200 when BTC just lost its EMA200; cover when BTC regains it'],
  ['Bottom alert', 'ON', 'Alert when BTC funding is -0.01% or lower (shorts crowded = market bottom zone). Alert only, no trade'],
  ['Relay URL', '', 'VPS relay (fixed IP) for WEEX trading keys, e.g. https://1.2.3.4/r/xxxx. Blank = call WEEX directly'],
  ['L_RSI20', 'ON', 'Long: market washout bounce - coin under 4H EMA200, RSI back above 20, while 3+ coins do it within 24h. Stop 2 ATR, target 2 ATR, max 2 days (OOS PF 2.87, 66% win)'],
  ['M_BOTTOM', 'OFF', 'Watch list: on a bottom alert, go long the coin for 72h (2024-26 only: 17 of 27 episodes green)'],
  ['ntfy topic', '', 'Optional: private ntfy.sh topic for phone pushes'],
  ['Web app URL', '', 'Paste after Deploy > Web app (needed for Approve links and the phone app)'],
  ['Bot slice $', 16, 'Money the bot may trade BY ITSELF on BOT-category coins (Coins tab) while Mode is APPROVE. 0 = off'],
  ['Bot $ per trade', 2, 'Margin per bot-slice trade'],
  ['Bot max open', 3, 'Max bot-slice trades open at once'],
  ['Missed-trade $', 1, 'If you do not tap an Approve trade in time, the bot takes it at this margin (tag MISSED-AUTO). 0 = off'],
  ['Missed max open', 6, 'Max missed-trade fills open at once'],
  ['Missed cap $', 15, 'Max total margin in missed-trade fills'],
  ['Auto leverage', 10, 'Leverage for bot-slice + missed trades (small $ needs leverage to clear WEEX minimum size)'],
  ['Event pause (min)', 60, 'Bot opens no new trades this many minutes before/after a HIGH-impact US report (FOMC, CPI, jobs). 0 = off'],
];
var STRAT_NAMES = { L_TPI: 'TPI breakout long', L_ST: 'SuperTrend long', S_FUND: 'Funding-extreme short', S_BBRSI: 'BB + RSI short', L_FUND: 'Funding-extreme long', S_BTCFLIP: 'BTC-breakdown short', M_BOTTOM: 'Market-bottom long', L_RSI20: 'Washout bounce long', CHAT: 'Atlas chat plan', CARD: 'Jacob trade card' };
var TABS = {
  Signals: ['Time (CT)', 'Coin', 'Strategy', 'Side', 'Price', 'Why', 'Action', 'Claude notes'],
  Orders: ['ID', 'Time (CT)', 'Coin', 'Strategy', 'Side', 'Qty', 'Ref price', 'Protective stop', 'Margin $', 'Leverage', 'Status', 'Token', 'Result', 'Claude notes'],
  Positions: ['ID', 'Coin', 'Strategy', 'Side', 'Opened (CT)', 'Entry', 'Qty', 'Margin $', 'Leverage', 'Stop', 'Mode', 'Status', 'Closed (CT)', 'Exit', 'P&L $', 'P&L %', 'Exit reason', 'Bars held', 'Claude notes', 'Tag'],
  Log: ['Time (CT)', 'Type', 'Message']
};

// ---------------- setup ----------------
function setupBot() {
  var ss = ss_();
  var home = ss.getSheetByName('Home') || ss.insertSheet('Home', 0);
  if (home.getLastRow() < 3) {
    home.getRange(1, 1, 1, 3).setValues([["Claude's Auto Trading Bot " + BOT.version, '', 'Rules: claude-bot/PLAYBOOK.md']]).setFontWeight('bold');
    home.getRange(2, 1, 1, 3).setValues([['Status', 'not run yet', '']]);
    home.getRange(4, 1, 1, 3).setValues([['Setting', 'Value', 'What it does']]).setFontWeight('bold');
    home.getRange(5, 1, DEFAULTS.length, 3).setValues(DEFAULTS);
    home.setColumnWidth(1, 190); home.setColumnWidth(2, 140); home.setColumnWidth(3, 520);
  }
  Object.keys(TABS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() == 0) { sh.appendRow(TABS[n]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, TABS[n].length).setFontWeight('bold'); }
  });
  var s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() == 'scan') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('scan').timeBased().everyHours(1).nearMinute(3).create();
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('APP_PIN')) p.setProperty('APP_PIN', String(Math.floor(100000 + Math.random() * 900000)));
  log_('SETUP', 'Tabs ready, hourly scan trigger on. App PIN: ' + p.getProperty('APP_PIN') + ' (Script Properties > APP_PIN).');
  status_('Set up. First scan runs within the hour. Mode: ' + set_('Mode'));
}

// ---------------- helpers ----------------
function ss_() { return SpreadsheetApp.openById('1YvHcmaDC4NJ3S7EFRTVITrWtHdOANyhhwclxLhGbNk8'); }   // by ID: works from triggers and the web app too
function ct_(d) { return Utilities.formatDate(d || new Date(), 'America/Chicago', 'M/d h:mm a'); }
function log_(type, msg) { ss_().getSheetByName('Log').appendRow([ct_(), type, msg]); }
function status_(msg) { ss_().getSheetByName('Home').getRange(2, 2).setValue(ct_() + ' - ' + msg); }
function set_(name) {
  var v = ss_().getSheetByName('Home').getRange(5, 1, DEFAULTS.length + 5, 2).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] == name) return v[i][1];
  for (var j = 0; j < DEFAULTS.length; j++) if (DEFAULTS[j][0] == name) return DEFAULTS[j][1];
  return '';
}
function setVal_(name, val) {
  var sh = ss_().getSheetByName('Home'), v = sh.getRange(5, 1, DEFAULTS.length + 5, 1).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] == name) { sh.getRange(5 + i, 2).setValue(val); return; }
}
function on_(name) { return String(set_(name)).toUpperCase() == 'ON'; }
function num_(name, lo, hi) { var n = Number(set_(name)); if (!isFinite(n)) n = 0; return Math.max(lo, Math.min(hi, n)); }
function get_(path) {
  var r = UrlFetchApp.fetch(BOT.base + path, { muteHttpExceptions: true });
  if (r.getResponseCode() != 200) throw new Error('WEEX ' + path.split('?')[0] + ' HTTP ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 150));
  return JSON.parse(r.getContentText());
}
function rowsRaw_(name) { return rows_(name); }
function rows_(name) { var sh = ss_().getSheetByName(name), n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, TABS[name].length).getValues(); }

// ---------------- indicators (closed candles only) ----------------
function ema_(a, n) { var k = 2 / (n + 1), e = null; return a.map(function (v) { e = e === null ? v : v * k + e * (1 - k); return e; }); }
function rsi_(c, n) {
  n = n || 14; var g = 0, l = 0, o = [NaN];
  for (var i = 1; i < c.length; i++) {
    var d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up / n; l += dn / n; o.push(i < n ? NaN : 100 - 100 / (1 + g / (l || 1e-9))); }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o.push(100 - 100 / (1 + g / (l || 1e-9))); }
  }
  return o;
}
function atr_(d, n) { var a = null; return d.map(function (x, i) { var tr = i ? Math.max(x.h - x.l, Math.abs(x.h - d[i - 1].c), Math.abs(x.l - d[i - 1].c)) : x.h - x.l; a = a === null ? tr : (a * (n - 1) + tr) / n; return a; }); }
function supertrend_(d) {
  var at = atr_(d, 30), dir = [1], fu = 0, fl = 0;
  for (var i = 0; i < d.length; i++) {
    var m = (d[i].h + d[i].l) / 2, u = m + 5 * at[i], lo = m - 5 * at[i];
    if (i === 0) { fu = u; fl = lo; continue; }
    fu = (u < fu || d[i - 1].c > fu) ? u : fu; fl = (lo > fl || d[i - 1].c < fl) ? lo : fl;
    var pd = dir[i - 1], nd = pd; if (pd === 1 && d[i].c < fl) nd = -1; else if (pd === -1 && d[i].c > fu) nd = 1; dir.push(nd);
  }
  return dir;
}
function candles_(coin) {
  var raw = [], now = Date.now();
  try { raw = get_('/capi/v3/market/klines?symbol=' + coin + 'USDT&interval=4h&limit=500') || []; } catch (e) { raw = []; }
  if (!raw.length) { // coin not on WEEX (e.g. XPIN): fall back to BloFin public 4H candles (confirmed bars only)
    try { var j = JSON.parse(UrlFetchApp.fetch('https://openapi.blofin.com/api/v1/market/candles?instId=' + coin + '-USDT&bar=4H&limit=500', { muteHttpExceptions: true }).getContentText());
      return (j.data || []).filter(function (x) { return x[8] == '1'; }).map(function (x) { return { t: Number(x[0]), o: +x[1], h: +x[2], l: +x[3], c: +x[4] }; }).sort(function (a, b) { return a.t - b.t; }); } catch (e) { return []; }
  }
  return raw.filter(function (x) { return Number(x[6]) < now; }).map(function (x) { return { t: Number(x[0]), o: +x[1], h: +x[2], l: +x[3], c: +x[4] }; }).sort(function (a, b) { return a.t - b.t; });
}
function ind_(d) {
  var c = d.map(function (x) { return x.c; }), n = d.length, i = n - 1;
  var win = function (k, f) { var m = f == 'h' ? -Infinity : Infinity; for (var j = i - k; j < i; j++) m = f == 'h' ? Math.max(m, d[j].h) : Math.min(m, d[j].l); return m; };
  var bb = (function () { var s = 0, q = 0; for (var j = i - 19; j <= i; j++) { s += c[j]; q += c[j] * c[j]; } var m = s / 20, sd = Math.sqrt(Math.max(q / 20 - m * m, 0)); return { u: m + 2 * sd, l: m - 2 * sd }; })();
  var r = rsi_(c), st = supertrend_(d);
  return { c: c[i], e200: ema_(c, 200)[i], rsi: r[i], rsiPrev: r[i - 1], atr: atr_(d, 14)[i], hh40: win(40, 'h'), ll20: win(20, 'l'), bbu: bb.u, bbl: bb.l, st: st[i], stPrev: st[i - 1], t: d[i].t };
}

// ---------------- the hourly scan ----------------
function scan() {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) { try { log_('INFO', 'scan skipped: another job held the lock'); } catch (e) { } return; }
  try {
    var p = PropertiesService.getScriptProperties();
    var btcD = candles_('BTC'), lastBar = btcD[btcD.length - 1].t;
    var newBar = String(lastBar) != p.getProperty('LAST_BAR');
    var be = ema_(btcD.map(function (x) { return x.c; }), 200), nB = btcD.length, btcUp = btcD[nB - 1].c > be[nB - 1];
    var btcFlipDown = !btcUp && btcD[nB - 2].c > be[nB - 2];
    try { health_(); } catch (e) { }
    try { reportLog_(); } catch (e) { log_('ERROR', 'report log: ' + e.message); }
    expireApprovals_();
    try { reconcile_(); } catch (e) { log_('ERROR', 'reconcile: ' + e.message); }
    try { manageTP_(); } catch (e) { log_('ERROR', 'take-profit check: ' + e.message); }
    var eq = equity_(); killCheck_(eq);
    if (!newBar) { status_('Waiting for the next 4H candle. BTC ' + (btcUp ? 'UP' : 'DOWN') + '. Equity $' + eq.toFixed(2) + '. Mode ' + set_('Mode') + (on_('Kill switch') ? ' | KILL SWITCH ON' : '')); return; }
    var open = rows_('Positions').filter(function (r) { return r[11] == 'OPEN'; });
    var pending = rows_('Orders').filter(function (r) { return r[10] == 'PENDING'; });
    var busy = {}; open.concat(pending).forEach(function (r) { busy[r[1 + (r.length == TABS.Orders.length ? 1 : 0)]] = 1; });
    var found = 0, bottom = bottomCheck_(lastBar);
    var DX = {}, wash = JSON.parse(p.getProperty('WASH') || '[]').filter(function (w) { return w.t > lastBar - 24 * 3600e3; });
    BOT.coins.forEach(function (coin) {
      try { var d = coin == 'BTC' ? btcD : candles_(coin); if (d.length < 260) return; var x = ind_(d); DX[coin] = { d: d, x: x };
        if (x.c < x.e200 && x.rsiPrev < 20 && x.rsi >= 20 && !wash.some(function (w) { return w.c == coin && w.t == x.t; })) wash.push({ c: coin, t: x.t });
      } catch (e) { log_('ERROR', coin + ': ' + e.message); }
    });
    p.setProperty('WASH', JSON.stringify(wash));
    var breadth = wash.length;
    if (breadth >= 3) log_('WASHOUT', breadth + ' coins bounced off RSI 20 in 24h: ' + wash.map(function (w) { return w.c; }).join(', '));
    BOT.coins.forEach(function (coin) {
      try {
        if (!DX[coin]) return;
        var d = DX[coin].d, x = DX[coin].x;
        x.btcUp = btcUp; x.breadth = breadth;
        manage_(coin, d, x, open);
        if (busy[coin]) return;
        var sig = signal_(coin, x, btcUp, btcFlipDown, bottom);
        if (sig) { found++; act_(coin, sig, x); busy[coin] = 1; }
      } catch (e) { log_('ERROR', coin + ': ' + e.message); }
    });
    p.setProperty('LAST_BAR', String(lastBar));
    status_('Scanned 4H candle ' + ct_(new Date(lastBar + 4 * 3600e3)) + '. BTC ' + (btcUp ? 'UP' : 'DOWN') + '. New signals: ' + found + '. Open: ' + rows_('Positions').filter(function (r) { return r[11] == 'OPEN'; }).length + '. Equity $' + equity_().toFixed(2) + '. Mode ' + set_('Mode'));
  } catch (e) { log_('ERROR', 'scan: ' + e.message); status_('Scan error: ' + e.message); }
  finally { lock.releaseLock(); }
}

// Entry rules (PLAYBOOK.md). Returns {strategy, side, why} or null.
function signal_(coin, x, btcUp, btcFlipDown, bottom) {
  var S = [];
  if (on_('L_RSI20') && x.c < x.e200 && x.rsiPrev < 20 && x.rsi >= 20 && x.breadth >= 3) S.push({ strategy: 'L_RSI20', side: 'LONG', stopAtr: 2, why: 'Washout bounce: RSI ' + x.rsiPrev.toFixed(0) + ' -> ' + x.rsi.toFixed(0) + ' under EMA200, ' + x.breadth + ' coins washing out in 24h' });
  if (bottom && on_('M_BOTTOM') && coin != 'BTC') S.push({ strategy: 'M_BOTTOM', side: 'LONG', why: 'BTC funding ' + (bottom * 100).toFixed(4) + '% (shorts crowded, market bottom zone)' });
  if (btcFlipDown && on_('S_BTCFLIP') && coin != 'BTC' && x.c < x.e200) S.push({ strategy: 'S_BTCFLIP', side: 'SHORT', why: 'BTC just closed under its EMA200; coin is under its EMA200 too' });
  if (on_('L_TPI') && btcUp && x.c > x.hh40 && x.c > x.e200 && x.rsi > 55 && x.atr / x.c < 0.05) S.push({ strategy: 'L_TPI', side: 'LONG', why: 'Close ' + x.c + ' broke the 40-candle high ' + x.hh40 + ', RSI ' + x.rsi.toFixed(0) + ', above EMA200, BTC up' });
  if (on_('L_ST') && btcUp && x.st === 1 && x.stPrev === -1) S.push({ strategy: 'L_ST', side: 'LONG', why: 'SuperTrend 30/5 flipped up, BTC up' });
  if (on_('S_BBRSI') && !btcUp && x.c < x.e200 && x.c > x.bbu && x.rsi < 70) S.push({ strategy: 'S_BBRSI', side: 'SHORT', why: 'Close ' + x.c + ' above upper BB ' + x.bbu.toFixed(4) + ', RSI ' + x.rsi.toFixed(0) + ', below EMA200, BTC down' });
  if (on_('S_FUND') || on_('L_FUND')) {
    var f = fundingSignal_(coin, x.t);
    if (f == 'HIGH' && !btcUp && on_('S_FUND')) S.push({ strategy: 'S_FUND', side: 'SHORT', why: 'Funding in its top 5% of the last 90 settlements (longs crowded), BTC down' });
    if (f == 'LOW' && btcUp && on_('L_FUND')) S.push({ strategy: 'L_FUND', side: 'LONG', why: 'Funding in its bottom 5% of the last 90 settlements (shorts crowded), BTC up' });
  }
  return S[0] || null;   // one trade per coin
}
function fundingSignal_(coin, barT) {
  var f = get_('/capi/v3/market/fundingRate?symbol=' + coin + 'USDT&limit=100').map(function (x) { return { t: Number(x.fundingTime), r: Number(x.fundingRate) }; }).sort(function (a, b) { return a.t - b.t; });
  if (f.length < 60) return null;
  var last = f[f.length - 1]; if (last.t < barT) return null;   // only a settlement inside the candle that just closed
  var w = f.slice(Math.max(0, f.length - 91), f.length - 1).map(function (x) { return x.r; }).sort(function (a, b) { return a - b; });
  var lo = w[Math.floor(w.length * 0.05)], hi = w[Math.floor(w.length * 0.95)];
  return last.r >= hi ? 'HIGH' : last.r <= lo ? 'LOW' : null;
}

// Exit rules for open bot positions on this coin.
function manage_(coin, d, x, open) {
  open.filter(function (r) { return r[1] == coin; }).forEach(function (r) {
    var id = r[0], strat = r[2], side = r[3] == 'LONG' ? 1 : -1, opened = parseTime_(r[4]), stop = Number(r[9]);
    var bars = d.filter(function (c) { return c.t >= opened; }).length, reason = '';
    if (r[10] == 'PAPER') {   // the exchange handles stops for live trades
      var hit = d.filter(function (c) { return c.t >= opened; }).some(function (c) { return side > 0 ? c.l <= stop : c.h >= stop; });
      if (hit) return closePos_(r, stop, 'Protective stop', bars);
    }
    if (strat == 'L_TPI' && (x.c < x.ll20 || x.rsi < 40)) reason = x.c < x.ll20 ? 'Close under 20-candle low' : 'RSI under 40';
    if (strat == 'L_ST' && x.st === -1) reason = 'SuperTrend flipped down';
    if ((strat == 'S_FUND' || strat == 'L_FUND') && bars >= 18) reason = '72h hold done';
    if (strat == 'S_BBRSI' && (x.c < x.bbl || bars >= 30)) reason = x.c < x.bbl ? 'Close under lower BB' : '30 candles';
    if (strat == 'S_BBRSI' && !reason && x.st === 1 && x.stPrev === -1) reason = 'Long trigger: SuperTrend flipped up';
    if (strat == 'S_BTCFLIP' && x.btcUp) reason = 'BTC back above EMA200';
    if (strat == 'M_BOTTOM' && bars >= 18) reason = '72h hold done';
    if (strat == 'L_RSI20') { var tgt = 2 * Number(r[5]) - stop;   // target = entry + 2 ATR (same distance as the 2 ATR stop)
      if (d.filter(function (c) { return c.t >= opened; }).some(function (c) { return c.h >= tgt; })) return closePos_(r, r[10] == 'PAPER' ? tgt : null, 'Target 2 ATR', bars);
      if (bars >= 12) reason = '2-day hold done'; }
    if (!reason && bars >= 120) reason = 'Max hold 20 days';
    if (reason) closePos_(r, null, reason, bars);
  });
}
// Market-bottom check (PLAYBOOK round 2): BTC funding <= -0.01% at a settlement inside the candle that just closed.
// Returns the funding rate when it fires, else 0. Alerts once per settlement.
function bottomCheck_(barT) {
  if (!on_('Bottom alert') && !on_('M_BOTTOM')) return 0;
  try {
    var f = get_('/capi/v3/market/fundingRate?symbol=BTCUSDT&limit=5').map(function (x) { return { t: Number(x.fundingTime), r: Number(x.fundingRate) }; }).sort(function (a, b) { return a.t - b.t; });
    var last = f[f.length - 1]; if (!last || last.t < barT || last.r > -0.0001) return 0;
    var p = PropertiesService.getScriptProperties();
    if (on_('Bottom alert') && p.getProperty('LAST_BOTTOM') != String(last.t)) {
      p.setProperty('LAST_BOTTOM', String(last.t));
      ss_().getSheetByName('Signals').appendRow([ct_(), 'MARKET', 'BOTTOM_ALERT', '-', '', 'BTC funding ' + (last.r * 100).toFixed(4) + '% (shorts crowded)', 'Alert only', '']);
      notify_('Market bottom zone', 'BTC funding is ' + (last.r * 100).toFixed(4) + '% - shorts are crowded. In 2024-26 this was followed by a 72h alt bounce 17 of 27 times. Consider covering shorts / looking for longs.');
    }
    return last.r;
  } catch (e) { log_('ERROR', 'bottomCheck: ' + e.message); return 0; }
}
function parseTime_(s) { if (s instanceof Date) return s.getTime(); var t = Date.parse(s); return isFinite(t) ? t : 0; }

// ---------------- acting on a signal ----------------
function act_(coin, sig, x) {
  var mode = String(set_('Mode')).toUpperCase(), kill = on_('Kill switch');
  var openN = rows_('Positions').filter(function (r) { return r[11] == 'OPEN'; }).length + rows_('Orders').filter(function (r) { return r[10] == 'PENDING'; }).length;
  var ev = eventPause_(), action = kill ? 'Skipped: kill switch ON' : ev ? 'Skipped: event pause (' + ev + ')' : openN >= num_('Max open trades', 1, 20) ? 'Skipped: max open trades' : mode;
  if (action == 'APPROVE' && sig.strategy != 'CHAT' && slice_('BOT-AUTO', coin)) action = 'BOT-AUTO';
  ss_().getSheetByName('Signals').appendRow([ct_(), coin, STRAT_NAMES[sig.strategy], sig.side, x.c, sig.why, action, '']);
  if (action.indexOf('Skipped') === 0) return;
  var lev = num_('Leverage', 1, 5), margin = equity_() * num_('Margin per trade %', 1, 50) / 100;
  var sa = sig.stopAtr || num_('Protective stop (ATR x)', 1, 10), stop = sig.stopPx || (sig.side == 'LONG' ? x.c - sa * x.atr : x.c + sa * x.atr);
  var o = { id: 'CB' + Date.now().toString(36).toUpperCase() + coin, coin: coin, strategy: sig.strategy, side: sig.side, ref: x.c, stop: stop, margin: margin, lev: lev, why: sig.why };
  o.qty = qty_(coin, margin * lev / x.c);
  if (!(o.qty > 0)) { log_('SKIP', coin + ' size below the exchange minimum'); return; }
  if (action == 'BOT-AUTO') { var bo = autoOrder_(o, num_('Bot $ per trade', 0, 50), 'BOT-AUTO'); if (bo) sendLive_(bo, 'AUTO'); return; }
  if (mode == 'PAPER') return openPos_(o, priceNow_(coin), 'PAPER', 'Paper fill');
  if (mode == 'AUTO') return sendLive_(o, 'AUTO');
  if (mode == 'APPROVE') {
    o.token = Utilities.getUuid().replace(/-/g, '');
    ss_().getSheetByName('Orders').appendRow([o.id, ct_(), coin, STRAT_NAMES[o.strategy], o.side, o.qty, o.ref, round_(o.stop), round_(margin), lev, 'PENDING', o.token, '', '']);
    var url = String(set_('Web app URL'));
    notify_('APPROVE? ' + o.side + ' ' + coin + ' (' + STRAT_NAMES[o.strategy] + ')',
      o.side + ' ' + o.qty + ' ' + coin + ' at about $' + o.ref + ', margin $' + round_(margin) + ' at ' + lev + 'x, protective stop $' + round_(o.stop) + '.\nWhy: ' + o.why +
      (url ? '\n\nApprove: ' + url + '?approve=' + o.id + '&k=' + o.token + '\nSkip: ' + url + '?reject=' + o.id + '&k=' + o.token : '\n\n(Add the Web app URL on the Home tab to get approve links.)') +
      '\nExpires in ' + num_('Approve window (min)', 5, 1440) + ' minutes.', url ? url + '?approve=' + o.id + '&k=' + o.token : '');
  }
}
function round_(n) { return Math.round(n * 10000) / 10000; }
function priceNow_(coin) { var t = get_('/capi/v3/market/ticker/24hr?symbol=' + coin + 'USDT'); return Number((t[0] || t).lastPrice); }
function qty_(coin, raw) {
  var info = symbolInfo_(coin); if (!info) return Math.floor(raw * 1000) / 1000;
  var f = Math.pow(10, info.quantityPrecision || 0), q = Math.floor(raw * f) / f;
  return q >= (info.minOrderSize || 0) ? q : 0;
}
function symbolInfo_(coin) {
  var c = CacheService.getScriptCache(), k = 'SYM_' + coin, v = c.get(k); if (v) return JSON.parse(v);
  var all = get_('/capi/v3/market/exchangeInfo').symbols || [], s = null;
  all.forEach(function (x) { if (BOT.coins.indexOf(x.baseAsset) >= 0) c.put('SYM_' + x.baseAsset, JSON.stringify({ quantityPrecision: x.quantityPrecision, pricePrecision: x.pricePrecision, minOrderSize: x.minOrderSize }), 21600); if (x.symbol == coin + 'USDT') s = x; });
  return s ? { quantityPrecision: s.quantityPrecision, pricePrecision: s.pricePrecision, minOrderSize: s.minOrderSize } : null;
}
function priceStr_(coin, p) { var info = symbolInfo_(coin), dp = info ? info.pricePrecision : 4; return Number(p).toFixed(dp); }

function openPos_(o, fill, mode, note) {
  var tag = o.tag || (mode == 'PAPER' ? 'PAPER' : /APPROVED/.test(note) ? 'JACOB-APPROVED' : 'BOT-AUTO');
  ss_().getSheetByName('Positions').appendRow([o.id, o.coin, o.strategy, o.side, new Date().toISOString(), fill, o.qty, round_(o.margin), o.lev, round_(o.stop), mode, 'OPEN', '', '', '', '', '', '', '', tag]);
  log_(mode, note + ': ' + o.side + ' ' + o.qty + ' ' + o.coin + ' @ ' + fill + ' (' + STRAT_NAMES[o.strategy] + ')');
  notify_(mode + ': ' + o.side + ' ' + o.coin + ' opened', o.side + ' ' + o.qty + ' ' + o.coin + ' at $' + fill + ', margin $' + round_(o.margin) + ' at ' + o.lev + 'x, stop $' + round_(o.stop) + '.\nWhy: ' + o.why);
}
function closePos_(r, exitPrice, reason, bars) {
  var sh = ss_().getSheetByName('Positions'), all = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(), row = -1;
  for (var i = 0; i < all.length; i++) if (all[i][0] == r[0]) row = i + 2;
  if (row < 0) return;
  var side = r[3] == 'LONG' ? 1 : -1, px = exitPrice || priceNow_(r[1]);
  if (r[10] == 'LIVE' && !exitPrice) { var res = weexClose_(r); if (!res.ok) { log_('ERROR', 'Close ' + r[1] + ' failed: ' + res.msg + ' - close it by hand on WEEX'); notify_('CLOSE FAILED ' + r[1], 'The bot could not close ' + r[1] + ': ' + res.msg + '. Close it by hand on WEEX.'); return; } }
  var pct = side * (px / Number(r[5]) - 1) - BOT.fee, pnl = Number(r[7]) * Number(r[8]) * pct, tpn = tpNote_(r);
  if (tpn.real) { pnl += tpn.real; reason += ' (incl. $' + tpn.real.toFixed(2) + ' from take-profits)'; }
  sh.getRange(row, 12, 1, 7).setValues([['CLOSED', ct_(), px, Math.round(pnl * 100) / 100, Math.round(pct * 10000) / 100 + '%', reason, bars]]);
  log_(r[10], 'Closed ' + r[3] + ' ' + r[1] + ' @ ' + px + ': ' + reason + ', P&L $' + pnl.toFixed(2));
  notify_(r[10] + ': ' + r[1] + ' closed ' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2), r[3] + ' ' + r[1] + ' closed at $' + px + ' (' + reason + '). P&L ' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2) + ' (' + (pct * 100).toFixed(2) + '% of position).');
}

// ---------------- equity + kill switch ----------------
function equity_() {
  var mode = String(set_('Mode')).toUpperCase();
  if (mode != 'PAPER' && keys_()) { try { var b = weex_('GET', '/capi/v3/account/balance', '', ''); var u = (b || []).filter(function (x) { return x.asset == 'USDT' || x.coinName == 'USDT'; })[0] || b[0] || {}; var v = Number(u.balance || u.equity || u.availableBalance); if (isFinite(v) && v > 0) return v; } catch (e) { log_('ERROR', 'balance: ' + e.message); } }
  var start = Number(set_('Paper start $')) || 200, real = 0;
  rows_('Positions').forEach(function (r) { if (r[10] == 'PAPER' && r[11] == 'CLOSED') real += Number(r[14]) || 0; });
  return start + real;
}
function killCheck_(eq) {
  var p = PropertiesService.getScriptProperties(), peak = Math.max(Number(p.getProperty('PEAK') || 0), eq), day = new Date().toISOString().slice(0, 10);
  p.setProperty('PEAK', String(peak));
  if (p.getProperty('DAY') != day) { p.setProperty('DAY', day); p.setProperty('DAY_START', String(eq)); }
  var dd = 1 - eq / peak, dl = 1 - eq / Number(p.getProperty('DAY_START') || eq);
  if (!on_('Kill switch') && (dd * 100 >= num_('Max drawdown % (kill)', 1, 90) || dl * 100 >= num_('Daily loss % (kill)', 1, 90))) {
    setVal_('Kill switch', 'ON');
    var msg = 'Kill switch ON: equity $' + eq.toFixed(2) + ', ' + (dd * 100).toFixed(1) + '% below peak, ' + (dl * 100).toFixed(1) + '% down today. No new trades until you set it back to OFF.';
    log_('KILL', msg); notify_('KILL SWITCH ON', msg);
  }
}

// ---------------- WEEX private API ----------------
function keys_() { var p = PropertiesService.getScriptProperties(); return p.getProperty('WEEX_KEY') && p.getProperty('WEEX_SECRET') && p.getProperty('WEEX_PASSPHRASE') ? p : null; }
function weex_(method, path, query, body) {
  var p = keys_(); if (!p) throw new Error('No WEEX keys in Script Properties');
  var ts = String(Date.now()), msg = ts + method + path + (query ? '?' + query : '') + (body || '');
  var sig = Utilities.base64Encode(Utilities.computeHmacSha256Signature(msg, p.getProperty('WEEX_SECRET')));
  var relay = String(set_('Relay URL') || '').trim().replace(/\/$/, '');
  var r = UrlFetchApp.fetch((relay || BOT.base) + path + (query ? '?' + query : ''), {
    method: method.toLowerCase(), contentType: 'application/json', payload: body || undefined, muteHttpExceptions: true,
    headers: { 'ACCESS-KEY': p.getProperty('WEEX_KEY'), 'ACCESS-SIGN': sig, 'ACCESS-PASSPHRASE': p.getProperty('WEEX_PASSPHRASE'), 'ACCESS-TIMESTAMP': ts }
  });
  var txt = r.getContentText();
  if (r.getResponseCode() != 200) throw new Error('HTTP ' + r.getResponseCode() + ' ' + txt.slice(0, 200));
  return JSON.parse(txt);
}
function sendLive_(o, how) {
  if (on_('Kill switch')) { log_('SKIP', 'Kill switch ON, not sending ' + o.coin); return { ok: false, msg: 'kill switch ON' }; }
  try {
    var lev = o.lev;
    // WEEX docs: send both isolated sides; if the symbol is in cross mode WEEX wants crossLeverage instead
    try { weex_('POST', '/capi/v3/account/leverage', '', JSON.stringify({ symbol: o.coin + 'USDT', marginType: 'ISOLATED', isolatedLongLeverage: String(lev), isolatedShortLeverage: String(lev) })); }
    catch (e) {
      try { weex_('POST', '/capi/v3/account/leverage', '', JSON.stringify({ symbol: o.coin + 'USDT', crossLeverage: String(lev) })); log_('WARN', 'leverage ' + o.coin + ': isolated refused, set cross ' + lev + 'x (' + e.message.slice(0, 80) + ')'); }
      catch (e2) { log_('WARN', 'leverage ' + o.coin + ': ' + e2.message); }
    }
    var body = { symbol: o.coin + 'USDT', side: o.side == 'LONG' ? 'BUY' : 'SELL', positionSide: o.side, type: 'MARKET', quantity: String(o.qty), newClientOrderId: o.id, slTriggerPrice: priceStr_(o.coin, o.stop), SlWorkingType: 'MARK_PRICE', reduceOnly: false };
    var res = weex_('POST', '/capi/v3/order', '', JSON.stringify(body));
    if (!res.success) throw new Error(res.errorCode + ' ' + res.errorMessage);
    openPos_(o, priceNow_(o.coin), 'LIVE', how + ' order sent (WEEX order ' + res.orderId + ')');
    return { ok: true, msg: 'Order ' + res.orderId };
  } catch (e) { log_('ERROR', 'Send ' + o.coin + ': ' + e.message); notify_('ORDER FAILED ' + o.coin, e.message); return { ok: false, msg: e.message }; }
}
function weexClose_(r) {
  try {
    var body = { symbol: r[1] + 'USDT', side: r[3] == 'LONG' ? 'SELL' : 'BUY', positionSide: r[3], type: 'MARKET', quantity: String(r[6]), newClientOrderId: 'X' + (r._tag || '') + r[0].slice(0, 26), reduceOnly: true };
    var res = weex_('POST', '/capi/v3/order', '', JSON.stringify(body));
    return res.success ? { ok: true } : { ok: false, msg: res.errorCode + ' ' + res.errorMessage };
  } catch (e) { return { ok: false, msg: e.message }; }
}

// ---------------- approvals ----------------
function findOrder_(id) { var v = rows_('Orders'); for (var i = 0; i < v.length; i++) if (v[i][0] == id) return { row: i + 2, r: v[i] }; return null; }
function setOrder_(row, status, result) { ss_().getSheetByName('Orders').getRange(row, 11, 1, 3).setValues([[status, '', result]]); }
function approve_(id, token, yes) {
  var f = findOrder_(id); if (!f || !token || f.r[11] != token) return 'That link is not valid.';
  if (f.r[10] != 'PENDING') return 'Already ' + String(f.r[10]).toLowerCase() + '.';
  if (!yes) { setOrder_(f.row, 'SKIPPED', 'Skipped by Jacob ' + ct_()); return 'Skipped. Nothing was sent.'; }
  var coin = f.r[2], strat = Object.keys(STRAT_NAMES).filter(function (k) { return STRAT_NAMES[k] == f.r[3]; })[0];
  var o = { id: f.r[0], coin: coin, strategy: strat, side: f.r[4], qty: Number(f.r[5]), ref: Number(f.r[6]), stop: Number(f.r[7]), margin: Number(f.r[8]), lev: Number(f.r[9]), why: 'Approved by Jacob' };
  var px = priceNow_(coin), drift = Math.abs(px / o.ref - 1);
  if (drift > 0.03) { setOrder_(f.row, 'EXPIRED', 'Price moved ' + (drift * 100).toFixed(1) + '% since the signal'); return 'Not sent: price moved ' + (drift * 100).toFixed(1) + '% since the signal.'; }
  if (!keys_()) { setOrder_(f.row, 'APPROVED (paper)', 'No WEEX keys yet, filled on paper'); openPos_(o, px, 'PAPER', 'Approved, paper fill (no keys yet)'); return 'Approved. No WEEX keys yet, so it was filled on paper at $' + px + '.'; }
  var res = sendLive_(o, 'APPROVED');
  setOrder_(f.row, res.ok ? 'SENT' : 'FAILED', res.msg);
  return res.ok ? 'Sent to WEEX. ' + res.msg : 'Failed: ' + res.msg;
}
function expireApprovals_() {
  var mins = num_('Approve window (min)', 5, 1440), now = Date.now();
  rows_('Orders').forEach(function (r, i) { if (r[10] == 'PENDING') { var ts = parseInt(String(r[0]).slice(2, -String(r[2]).length), 36); if (isFinite(ts) && now - ts > mins * 60e3) {
    var miss = null; try { miss = missedFill_(r); } catch (e) { log_('ERROR', 'missed fill ' + r[2] + ': ' + e.message); }
    setOrder_(i + 2, 'EXPIRED', 'Not approved in time' + (miss ? ' - ' + miss : '')); } } });
}
// ---------------- bot slice, missed-trade fallback, event pause ----------------
function coinCat_(coin) {
  var c = CacheService.getScriptCache(), v = c.get('CAT_' + coin); if (v) return v;
  var sh = ss_().getSheetByName('Coins'); if (!sh || sh.getLastRow() < 2) return 'UNKNOWN';
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues(), out = 'SKIP', put = {};
  rows.forEach(function (r) { put['CAT_' + r[0]] = String(r[9]); if (r[0] == coin) out = String(r[9]); });
  try { c.putAll(put, 21600); } catch (e) { }
  return out;
}
function tagOpen_(tag) { return rows_('Positions').filter(function (r) { return r[11] == 'OPEN' && r[19] == tag; }); }
function slice_(tag, coin) {   // room left in the bot's own slice?
  if (!keys_()) return false;
  if (tag == 'BOT-AUTO') { var cap = num_('Bot slice $', 0, 1000), per = num_('Bot $ per trade', 0, 50), o = tagOpen_(tag);
    if (!(cap > 0 && per > 0) || coinCat_(coin) != 'BOT') return false;
    return o.length < num_('Bot max open', 0, 20) && o.reduce(function (s, r) { return s + Number(r[7]); }, 0) + per <= cap; }
  var mc = num_('Missed cap $', 0, 1000), mp = num_('Missed-trade $', 0, 50), m = tagOpen_('MISSED-AUTO');
  return mc > 0 && mp > 0 && m.length < num_('Missed max open', 0, 20) && m.reduce(function (s, r) { return s + Number(r[7]); }, 0) + mp <= mc;
}
function autoOrder_(o, margin, tag) {   // re-size a signal to the small auto margin at Auto leverage
  var lev = num_('Auto leverage', 1, 50), px = priceNow_(o.coin);
  var a = { id: (tag == 'BOT-AUTO' ? 'BA' : 'MA') + Date.now().toString(36).toUpperCase() + o.coin, coin: o.coin, strategy: o.strategy, side: o.side, ref: px, stop: o.stop, margin: margin, lev: lev, why: tag + ': ' + (o.why || ''), tag: tag };
  if (o.side == 'LONG' ? o.stop >= px : o.stop <= px) { log_('SKIP', tag + ' ' + o.coin + ': price already past the stop'); return null; }
  var liqDist = 1 / lev - 0.005, stopDist = Math.abs(px - o.stop) / px;
  if (stopDist >= liqDist) { log_('SKIP', tag + ' ' + o.coin + ': stop ' + (stopDist * 100).toFixed(1) + '% away is past liquidation at ' + lev + 'x'); return null; }
  a.qty = qty_(o.coin, margin * lev / px);
  if (!(a.qty > 0)) { log_('SKIP', tag + ' ' + o.coin + ': $' + margin + ' at ' + lev + 'x is below the WEEX minimum size'); return null; }
  return a;
}
function missedFill_(r) {   // Orders row -> small auto trade if the missed-trade fallback has room
  if (r[3] == STRAT_NAMES.CHAT || !slice_('MISSED-AUTO', r[2])) return '';
  if (eventPause_()) return 'missed-trade fill skipped (event pause)';
  var strat = Object.keys(STRAT_NAMES).filter(function (k) { return STRAT_NAMES[k] == r[3]; })[0];
  var px = priceNow_(r[2]); if (Math.abs(px / Number(r[6]) - 1) > 0.03) return 'missed-trade fill skipped (price moved 3%+)';
  var a = autoOrder_({ coin: r[2], strategy: strat, side: r[4], stop: Number(r[7]), why: 'missed approve ' + r[0] }, num_('Missed-trade $', 0, 50), 'MISSED-AUTO');
  if (!a) return 'missed-trade fill skipped (size/stop)';
  var res = sendLive_(a, 'AUTO'); return res.ok ? 'bot took it at $' + a.margin + ' (MISSED-AUTO)' : 'missed-trade fill failed: ' + res.msg;
}
function eventPause_() {   // name of a HIGH-impact US report within +-N minutes, else ''
  var mins = num_('Event pause (min)', 0, 600); if (!mins) return '';
  try { var n = news_(), now = Date.now(), hit = (n.cal || []).filter(function (e) { return e.imp == 'High' && Math.abs(new Date(e.when).getTime() - now) <= mins * 60e3; })[0]; return hit ? hit.t : ''; } catch (e) { return ''; }
}

// ---------------- notifications ----------------
// Health check (hourly): Atlas page + relay on the server. 2 misses in a row = one alert; alert again when it's back.
function health_() {
  var p = PropertiesService.getScriptProperties(), now = Date.now();
  if (now - Number(p.getProperty('HEALTH_AT') || 0) < 55 * 60e3) return;
  p.setProperty('HEALTH_AT', String(now));
  var relay = String(set_('Relay URL') || '').trim().replace(/\/$/, ''), bad = [];
  function up(u, needOk) { try { var r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true }); return needOk ? r.getResponseCode() < 400 : true; } catch (e) { return false; } }
  if (!up('https://157-230-148-63.sslip.io/atlas/', true)) bad.push('Atlas app');
  if (relay && !up(relay + '/capi/v3/market/time', false)) bad.push('WEEX relay');
  var miss = bad.length ? Number(p.getProperty('HEALTH_MISS') || 0) + 1 : 0, was = p.getProperty('HEALTH_DOWN') == '1';
  p.setProperty('HEALTH_MISS', String(miss));
  if (miss >= 2 && !was) { p.setProperty('HEALTH_DOWN', '1'); log_('ERROR', 'Health: down - ' + bad.join(', ')); notify_('Server down', bad.join(' + ') + ' not answering for 2 checks (2 hours). Check DigitalOcean droplet 620570168.'); }
  if (!bad.length && was) { p.setProperty('HEALTH_DOWN', '0'); log_('INFO', 'Health: back up'); notify_('Server back up', 'Atlas + relay answering again.'); }
}
function notify_(title, body, clickUrl) {
  try { MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Claude's Bot | " + title, body); } catch (e) { }
  var topic = String(set_('ntfy topic')).trim();
  if (topic) { try { var h = { Title: title.replace(/[^\x20-\x7E]/g, '') }; if (clickUrl) h.Click = clickUrl; UrlFetchApp.fetch('https://ntfy.sh/' + encodeURIComponent(topic), { method: 'post', payload: body, headers: h, muteHttpExceptions: true }); } catch (e) { } }
}

// ---------------- web app: phone app JSON + approve links ----------------
function doGet(e) {
  var q = (e && e.parameter) || {};
  if (q.approve || q.reject) {
    var msg = approve_(q.approve || q.reject, q.k, !!q.approve);
    return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><div style="font:18px system-ui;padding:28px;max-width:520px;margin:auto"><b>Claude\'s Bot</b><p>' + msg.replace(/</g, '&lt;') + '</p></div>');
  }
  if (q.json) {
    var rows_ = function (n) { return rowsRaw_(n).map(function (r) { return r.map(function (v) { return v instanceof Date ? ct_(v) : v; }); }); };
    var pin = PropertiesService.getScriptProperties().getProperty('APP_PIN');
    if (String(q.pin || '') != String(pin)) return json_({ ok: false, err: 'PIN' });
    if (q.news) return json_(news_());
    if (q.liq) return json_(liq_());
    if (q.bets) return json_(bets_());
    if (q.coins) return json_(buildCoins());
    if (q.chat) { var hist = []; try { hist = JSON.parse(q.h || '[]').slice(-4); } catch (e) { } return json_(chat_(String(q.chat).slice(0, 600), hist)); }
    if (q.set == 'buynow' && q.coin) return json_(buyNow_(q));
    if (q.set == 'plan' && q.coin && /^(LONG|SHORT)$/.test(q.side)) return json_(queuePlan_(q));
    if (q.set == 'kill') setVal_('Kill switch', q.v == 'ON' ? 'ON' : 'OFF');
    if (q.set == 'mode' && /^(PAPER|APPROVE|AUTO)$/.test(q.v)) setVal_('Mode', q.v);
    if (q.set == 'close' && q.id) {   // Jacob's "close now" button in the app (market close; live trades close on WEEX)
      var lk = LockService.getScriptLock(); lk.waitLock(20000);
      try { var pr = rowsRaw_('Positions').filter(function (r) { return r[0] == q.id && r[11] == 'OPEN'; })[0]; if (pr) closePos_(pr, null, 'Closed from app', ''); } finally { lk.releaseLock(); }
      CacheService.getScriptCache().remove('LIVE');
    }
    return json_({ ok: true, status: ss_().getSheetByName('Home').getRange(2, 2).getValue(), mode: set_('Mode'), kill: set_('Kill switch'), equity: equity_(), dayStart: Number(PropertiesService.getScriptProperties().getProperty('DAY_START')) || 0, killPct: num_('Daily loss % (kill)', 1, 90), peak: Number(PropertiesService.getScriptProperties().getProperty('PEAK')) || 0, ddPct: num_('Max drawdown % (kill)', 1, 90),
      positions: rows_('Positions').slice(-60), orders: rows_('Orders').filter(function (r) { return r[10] == 'PENDING'; }).map(function (r) { return r.slice(0, 11).concat([r[11]]); }), signals: rows_('Signals').slice(-30), log: rows_('Log').slice(-25), phoenix: phoenix_(), keys: !!keys_(), live: livePnl_() });
  }
  return json_({ ok: true, service: "Claude's Auto Trading Bot", version: BOT.version });
}
// Read-only view of Jacob's Phoenix sheet (his copy of Dustin's screener + BloFin triggers) for the phone app.
// Display only: nothing here feeds a trade. Never writes to Phoenix.
var PHOENIX_ID = '1wLqM8v9ITnGj44SLqZPIIQzjt7yTUeRASAnlDSMShf4';
function phoenix_() {
  try {
    var c = CacheService.getScriptCache(), hit = c.get('PHX'); if (hit) return JSON.parse(hit);
    var px = SpreadsheetApp.openById(PHOENIX_ID);
    var pk = px.getSheetByName('🎯 Pick Triggers').getRange(1, 1, 33, 16).getDisplayValues();
    var bt = px.getSheetByName('⚡ BloFin Triggers').getRange(1, 1, 1, 1).getDisplayValues()[0][0];
    var bw = null; try { bw = SpreadsheetApp.openById('1TjKdjYRRhtPLonWCAc3YRWT66VHhDeUBjG7a5SNo2I8').getSheetByName('🟣 Bottom Watch').getRange(1, 1, 30, 4).getDisplayValues(); } catch (e) { }
    var picks = pk.slice(3).filter(function (r) { return r[1]; }).map(function (r) { return { rank: r[0], coin: r[1], score: r[2], state: r[6], ready: Number(r[7]) || 0, why: r[8], plan: r[11] }; })
      .sort(function (a, b) { return b.ready - a.ready; }).slice(0, 8);
    var bottom = bw ? bw.slice(5).filter(function (r) { return r[0] && /CONFIRMED|Forming/.test(r[1]); }).map(function (r) { return { coin: r[0], verdict: r[1], grade: r[2], conf: r[3] }; }) : [];
    var o = { header: pk[0][0], gate: bt, picks: picks, bottom: bottom, bottomHeader: bw ? bw[1][0] : '' };
    c.put('PHX', JSON.stringify(o), 900);
    return o;
  } catch (e) { return { err: e.message }; }
}
// Unrealized P&L of open positions at the current WEEX price (for the phone app). Cached 60 s.
function livePnl_() {
  try {
    var c = CacheService.getScriptCache(), hit = c.get('LIVE'); if (hit) return JSON.parse(hit);
    var o = {}, px = {};
    rows_('Positions').filter(function (r) { return r[11] == 'OPEN'; }).forEach(function (r) {
      var coin = r[1]; if (!(coin in px)) px[coin] = priceNow_(coin);
      var side = r[3] == 'LONG' ? 1 : -1, entry = Number(r[5]), qty = Number(r[6]);
      o[r[0]] = { price: px[coin], pnl: Math.round(side * (px[coin] - entry) * qty * 100) / 100 };
    });
    c.put('LIVE', JSON.stringify(o), 60);
    return o;
  } catch (e) { return {}; }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// ---------------- tests ----------------
function testScanDry() { var d = candles_('SOL'), x = ind_(d); Logger.log(JSON.stringify(x)); Logger.log(JSON.stringify(signal_('SOL', x, true)) + ' / ' + JSON.stringify(signal_('SOL', x, false))); }
function testKeys() { Logger.log(JSON.stringify(weex_('GET', '/capi/v3/account/balance', '', ''))); }

// Run from the editor: checks the VPS relay is up and (if keys are set) that WEEX answers through it.
function testRelay() {
  var relay = String(set_('Relay URL') || '').trim().replace(/\/$/, '');
  if (!relay) { Logger.log('Relay URL is blank on the Home tab'); return; }
  var host = relay.split('/r/')[0];
  var h = UrlFetchApp.fetch(host + '/health', { muteHttpExceptions: true });
  Logger.log('Relay health: HTTP ' + h.getResponseCode() + ' ' + h.getContentText());
  if (keys_()) { try { Logger.log('WEEX balance via relay: ' + JSON.stringify(weex_('GET', '/capi/v3/account/balance', '', '')).slice(0, 300)); } catch (e) { Logger.log('WEEX via relay: ' + e.message); } }
}


// ---------------- Atlas chat: "day trade XRP on the 15m" -> live data + tested rules -> Claude writes the plan ----------------
// Needs Script Property CLAUDE_API_KEY. Uses the cheap fast model. Plans only; a trade is only queued when Jacob taps the button.
var CHAT_COINS = ['BTC','ETH','SOL','XRP','DOGE','ADA','AVAX','LINK','LTC','BCH','BNB','TRX','XLM','NEAR','UNI','SUI','HYPE','XMR','ZEC','ARB','OP','APT','INJ','HBAR','DOT','PEPE','WIF','SEI','TIA','ENA','ONDO','TON','FET','RENDER','JUP','KAS','POL','ATOM','FIL','AAVE'];
function bfCandles_(coin, bar) {
  var u = 'https://openapi.blofin.com/api/v1/market/candles?instId=' + coin + '-USDT&bar=' + bar + '&limit=300', j = null;
  for (var k = 0; k < 3 && !j; k++) { try { j = JSON.parse(UrlFetchApp.fetch(u, { muteHttpExceptions: true }).getContentText()); } catch (e) { Utilities.sleep(1200); } }   // BloFin rate limit returns an HTML page
  var d = ((j && j.data) || []).filter(function (x) { return x[8] == '1'; });
  return d.map(function (x) { return { t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[6] || +x[5] }; }).reverse();
}
function tfSummary_(coin, bar) {
  var d = bfCandles_(coin, bar); if (d.length < 220) return null;
  var x = ind_(d), c = d.map(function (k) { return k.c; }), n = c.length - 1, e20 = ema_(c, 20)[n], e50 = ema_(c, 50)[n];
  var va = 0; for (var j = n - 24; j < n; j++) va += d[j].v; va /= 24;
  return { tf: bar, close: x.c, ema20: +e20.toPrecision(6), ema50: +e50.toPrecision(6), ema200: +x.e200.toPrecision(6), rsi: +x.rsi.toFixed(1), rsiPrev: +x.rsiPrev.toFixed(1),
    atr: +x.atr.toPrecision(5), high40: x.hh40, low20: x.ll20, supertrend: x.st === 1 ? 'up' : 'down', volVsAvg: +(d[n].v / (va || 1)).toFixed(2),
    last5: d.slice(-5).map(function (k) { return [k.o, k.h, k.l, k.c]; }) };
}
function chat_(text, hist) {
  hist = hist || [];
  var ck = 'CH_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, text + JSON.stringify(hist))), cache = CacheService.getScriptCache(), hit = cache.get(ck); if (hit) return JSON.parse(hit);
  var key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!key) return { ok: true, reply: 'Add CLAUDE_API_KEY in Script Properties first.' };
  var up = text.toUpperCase(), coin = (CHAT_COINS.filter(function (c) { return new RegExp('\\b' + c + '\\b').test(up); })[0]) || null;
  var mine = rowsRaw_('Positions').filter(function (r) { return r[11] == 'OPEN' && r[10] == 'LIVE'; }).map(function (r) { return { coin: r[1], side: r[3], entry: r[5], qty: r[6], stop: r[9] }; });
  if (!coin && mine.length && /\bMY\b|OPEN TRADE|POSITION/.test(up)) coin = mine[mine.length - 1].coin;
  if (!coin && hist.length) { var hu = hist.map(function (h) { return String(h.u || ''); }).join(' ').toUpperCase(); coin = (CHAT_COINS.filter(function (c) { return new RegExp('\\b' + c + '\\b').test(hu); }).pop()) || null; }
  if (!coin && /SOLANA/.test(up)) coin = 'SOL'; if (!coin && /BITCOIN/.test(up)) coin = 'BTC'; if (!coin && /ETHEREUM/.test(up)) coin = 'ETH'; if (!coin && /DOGECOIN/.test(up)) coin = 'DOGE'; if (!coin && /ARBITRUM/.test(up)) coin = 'ARB';
  var swing = /SWING|4 ?H|DAILY|1 ?D\b|DAYS|WEEK/.test(up), tfs = /15 ?M/.test(up) ? ['15m', '1H', '4H'] : swing ? ['1H', '4H', '1D'] : ['15m', '1H', '4H'];
  var data = null;
  if (coin) { data = { coin: coin, style: swing ? 'swing' : 'day trade', frames: tfs.map(function (b) { try { return tfSummary_(coin, b) || { tf: b, err: 'not enough candles' }; } catch (e) { return { tf: b, err: e.message }; } }) };
    try { var f = JSON.parse(UrlFetchApp.fetch('https://openapi.blofin.com/api/v1/market/funding-rate?instId=' + coin + '-USDT', { muteHttpExceptions: true }).getContentText()).data; if (f && f[0]) data.funding = f[0].fundingRate; } catch (e) { } }
  var wash = []; try { wash = JSON.parse(PropertiesService.getScriptProperties().getProperty('WASH') || '[]'); } catch (e) { }
  var sys = "You are Atlas, Jacob's trading assistant inside his phone app. Answer in plain short English, vertical lists, plain dollars, no tables. " +
    "You get live BloFin candles summarised per timeframe. Our TESTED rules (backtests 2023-2026, out-of-sample): " +
    "1) Washout bounce L_RSI20: coin below 4H EMA200, 4H RSI crosses back up through 20 while 3+ coins do it within 24h -> long, stop 2 ATR(4H), target 2 ATR, max 2 days (PF 2.9, 66% win). " +
    "2) TPI: 4H close above prior 40-candle high, above EMA200, RSI>55 -> long, exit on close below 20-candle low or RSI<40 (PF 1.4). " +
    "3) 1H volume spike: 1H candle up 2.5%+ on 3x avg volume, above 1H EMA200 -> long, stop 1.5 ATR(1H), exit after 6h (PF 1.4, weak since Aug 2026). " +
    "FAILED rules (do not recommend): breakout above a recent high on 1H/24h, EMA20 pullback buys, RSI(2) dips, most 4H shorts. " +
    "Fees ~0.15% round trip on WEEX: skip setups whose target is under ~0.6% away. Be honest: if no tested rule fires, say WAIT and give the exact trigger level that would make it a trade. " +
    "Never promise profit. Keep risk small: suggest risking about 1% of the account per trade. " +
    "Earlier messages in this chat are follow-ups: keep the same coin unless Jacob names a new one. If he asks about his open trade, use his open WEEX trades data (entry, stop, size) and say hold, tighten stop, take profit or close, with the exact price. " +
    "End your answer with one line of JSON exactly like: PLAN {\"coin\":\"XRP\",\"side\":\"LONG|SHORT|NONE\",\"verdict\":\"ENTER|WAIT|AVOID\",\"entry\":0,\"stop\":0,\"tp1\":0,\"tp2\":0,\"rule\":\"name or UNTESTED\"}";
  var msg = 'Jacob asked: ' + text + '\n\nLive data: ' + JSON.stringify(data || { note: 'no coin recognised - ask which coin' }) + '\nWashout bounces in last 24h: ' + JSON.stringify(wash) + '\nJacob\'s open real WEEX trades: ' + JSON.stringify(mine) + (/PHOENIX|BOARD|PICK|SCREENER|BOTTOM/.test(up) || !coin ? '\nPhoenix board (Dustin screener, read-only): ' + (function () { var x = phoenix_(); return JSON.stringify({ gate: x.gate, picks: (x.picks || []).slice(0, 5), bottom: (x.bottom || []).slice(0, 4) }).slice(0, 1800); })() : '') + '\nTime: ' + ct_();
  var r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 4000, system: sys, messages: hist.reduce(function (a, h) { a.push({ role: 'user', content: String(h.u || '').slice(0, 600) }); a.push({ role: 'assistant', content: String(h.a || '').slice(0, 700) || '(answered)' }); return a; }, []).concat([{ role: 'user', content: msg }]) }) });
  var j = JSON.parse(r.getContentText());
  if (r.getResponseCode() != 200) return { ok: true, reply: 'Claude API error: ' + ((j.error && j.error.message) || r.getResponseCode()) };
  var txt = (j.content || []).map(function (b) { return b.text || ''; }).join(''), plan = null, m = txt.match(/PLAN\s*(\{[^\n]*\})/);
  if (!txt) return { ok: true, reply: 'Empty answer (stop: ' + j.stop_reason + ', blocks: ' + (j.content || []).map(function (b) { return b.type; }).join(',') + ', model: ' + j.model + ')' };
  if (m) { try { plan = JSON.parse(m[1]); } catch (e) { } txt = txt.replace(m[0], '').trim(); }
  log_('CHAT', text.slice(0, 120) + ' -> ' + (plan ? plan.verdict + ' ' + plan.side + ' ' + plan.coin : 'no plan'));
  var out = { ok: true, reply: txt, plan: plan, coin: coin }; try { cache.put(ck, JSON.stringify(out), 300); } catch (e) { }
  return out;
}
// Jacob tapped "Queue this trade": goes through the normal bot path (Paper fill, or a pending Approve order he still has to tap).
function queuePlan_(q) {
  var coin = String(q.coin).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (BOT.coins.indexOf(coin) < 0 && CHAT_COINS.indexOf(coin) < 0) return { ok: false, err: 'Unknown coin' };
  var lk = LockService.getScriptLock(); lk.waitLock(20000);
  try {
    var d = candles_(coin); if (d.length < 220) return { ok: false, err: 'Not enough WEEX data for ' + coin };
    var x = ind_(d), stop = Number(q.stop);
    if (!(stop > 0) || (q.side == 'LONG' ? stop >= x.c : stop <= x.c)) return { ok: false, err: 'Stop is on the wrong side of the price' };
    act_(coin, { strategy: 'CHAT', side: q.side, stopPx: stop, why: 'Atlas chat plan (' + (q.rule || 'untested') + ')' }, x);
    return { ok: true, msg: 'Queued ' + q.side + ' ' + coin + ' (mode ' + set_('Mode') + ')' };
  } catch (e) { return { ok: false, err: e.message }; } finally { lk.releaseLock(); }
}
function testChat() { Logger.log(JSON.stringify(chat_('day trade XRP on the 15m')).slice(0, 1500)); }
function testFrames() {
  try { var r = UrlFetchApp.fetch('https://openapi.blofin.com/api/v1/market/candles?instId=XRP-USDT&bar=1H&limit=300', { muteHttpExceptions: true }); Logger.log('HTTP ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 200)); } catch (e) { Logger.log('fetch err ' + e.message); }
  try { Logger.log(JSON.stringify(tfSummary_('XRP', '1H'))); } catch (e) { Logger.log('tf err ' + e.message + ' ' + e.stack); }
}

// ---------------- News: this week's US economic calendar + crypto headlines (cached 30 min) ----------------
function news_() {
  var c = CacheService.getScriptCache(), hit = c.get('NEWS3'); if (hit) return JSON.parse(hit);
  var out = { ok: true, at: ct_(), cal: [], head: [], err: [] };
  try {
    var H = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept': 'application/json,text/xml,*/*' }, muteHttpExceptions: true }, ev = null, txt = UrlFetchApp.fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', H).getContentText();
    if (/^\s*\[/.test(txt)) ev = JSON.parse(txt);
    else { txt = UrlFetchApp.fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', H).getContentText();
      ev = XmlService.parse(txt).getRootElement().getChildren('event').map(function (e) { var d = e.getChildText('date'), t = e.getChildText('time'), m = String(d).match(/(\d+)-(\d+)-(\d+)/), tm = String(t).match(/(\d+):(\d+)(am|pm)/i), dt = null;
        if (m) { var hh = tm ? (Number(tm[1]) % 12) + (/pm/i.test(tm[3]) ? 12 : 0) : 0; dt = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hh, tm ? Number(tm[2]) : 0)); }  // XML times are GMT (checked: FOMC minutes 7:00pm = JSON 14:00-05:00)
        return { title: e.getChildText('title'), country: e.getChildText('country'), impact: e.getChildText('impact'), date: dt ? dt.toISOString() : d, forecast: e.getChildText('forecast'), previous: e.getChildText('previous'), actual: e.getChildText('actual') }; }); }
    out.cal = ev.filter(function (e) { return e.country == 'USD' && (e.impact == 'High' || e.impact == 'Medium'); }).map(function (e) {
      return { t: e.title, when: e.date, imp: e.impact, fc: e.forecast || '', prev: e.previous || '', act: e.actual || '' }; });
  } catch (e) { out.err.push('calendar: ' + e.message); }
  [['CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/'], ['Cointelegraph', 'https://cointelegraph.com/rss']].forEach(function (f) {
    try {
      var x = XmlService.parse(UrlFetchApp.fetch(f[1], { muteHttpExceptions: true }).getContentText()), items = x.getRootElement().getChild('channel').getChildren('item').slice(0, 8);
      items.forEach(function (it) { out.head.push({ src: f[0], t: it.getChildText('title'), link: it.getChildText('link'), when: it.getChildText('pubDate') }); });
    } catch (e) { out.err.push(f[0] + ': ' + e.message); }
  });
  out.head.sort(function (a, b) { return new Date(b.when) - new Date(a.when); }); out.head = out.head.slice(0, 12);
  try { if (out.cal.length) c.put('NEWS3', JSON.stringify(out), 1800); } catch (e) { }
  return out;
}
// Report log (Reports tab): every USD High-impact release this week - forecast vs actual + BTC move 1h/4h/24h after.
// Builds our own reaction history (#81). Runs hourly from scan; reads ForexFactory weekly feed + BloFin 1H candles.
function reportLog_() {
  var p = PropertiesService.getScriptProperties(), now = Date.now();
  if (now - Number(p.getProperty('REPORTS_AT') || 0) < 55 * 60e3) return;
  p.setProperty('REPORTS_AT', String(now));
  var ss = ss_(), sh = ss.getSheetByName('Reports');
  if (!sh) { sh = ss.insertSheet('Reports'); sh.getRange(1, 1, 1, 12).setValues([['Release (CT)', 'Event', 'Impact', 'Forecast', 'Previous', 'Actual', 'vs forecast', 'BTC at release', 'BTC +1h %', 'BTC +4h %', 'BTC +24h %', 'Key']]).setFontWeight('bold'); sh.setFrozenRows(1); }
  var cal = (news_().cal || []).filter(function (e) { return e.imp == 'High' && new Date(e.when).getTime() < now; });
  if (!cal.length) return;
  var k1 = JSON.parse(UrlFetchApp.fetch('https://openapi.blofin.com/api/v1/market/candles?instId=BTC-USDT&bar=1H&limit=300', { muteHttpExceptions: true }).getContentText()).data || [], H = {};
  k1.forEach(function (x) { H[Number(x[0])] = { o: +x[1], c: +x[4], done: x[8] == '1' }; });
  function hr(t) { return Math.floor(t / 3600e3) * 3600e3; }
  function mv(t0, hrs) { var a = H[hr(t0)], b = H[hr(t0) + (hrs - 1) * 3600e3]; return a && b && b.done ? Math.round((b.c / a.o - 1) * 10000) / 100 : ''; }
  var last = sh.getLastRow(), rows = last > 1 ? sh.getRange(2, 1, last - 1, 12).getValues() : [], idx = {};
  rows.forEach(function (r, i) { idx[r[11]] = i; });
  cal.forEach(function (e) {
    var t = new Date(e.when).getTime(), key = e.t + '|' + e.when, a = H[hr(t)];
    var num = function (v) { var m = String(v).replace(/[,%KMB]/g, '').match(/-?[\d.]+/); return m ? Number(m[0]) : NaN; };
    var vs = e.act && e.fc && isFinite(num(e.act)) && isFinite(num(e.fc)) ? (num(e.act) > num(e.fc) ? 'ABOVE' : num(e.act) < num(e.fc) ? 'BELOW' : 'IN LINE') : '';
    var row = [Utilities.formatDate(new Date(t), 'America/Chicago', 'MM/dd h:mm a'), e.t, e.imp, e.fc, e.prev, e.act, vs, a ? a.o : '', mv(t, 1), mv(t, 4), mv(t, 24), key];
    if (idx[key] == null) { sh.appendRow(row); idx[key] = -1; }
    else if (idx[key] >= 0) { var r = rows[idx[key]]; for (var j = 3; j < 11; j++) if (r[j] === '' && row[j] !== '') sh.getRange(idx[key] + 2, j + 1).setValue(row[j]); }
  });
}
function testNews() { Logger.log(JSON.stringify(news_()).slice(0, 2000)); }

// ---------------- Coins tab: every USDT perp on BloFin + WEEX, with BOT / JACOB / SKIP category ----------------
// BOT   = WEEX 24h volume >= $50M  (deep enough for the bot's fast trades)
// JACOB = >= $5M on either exchange (fine for slower 4H/daily setups he taps)
// SKIP  = thinner than that, or not a crypto coin (stocks, forex, metals)
function buildCoins() {
  var M = {}, get = function (u) { return JSON.parse(UrlFetchApp.fetch(u, { muteHttpExceptions: true }).getContentText()); };
  var bt = get('https://openapi.blofin.com/api/v1/market/tickers').data || [], bi = get('https://openapi.blofin.com/api/v1/market/instruments').data || [];
  var lev = {}; bi.forEach(function (x) { lev[x.instId] = { ml: Number(x.maxLeverage), cls: x.assetClass }; });
  bt.forEach(function (t) { var m = String(t.instId).match(/^(.+)-USDT$/); if (!m) return; var c = m[1], r = M[c] = M[c] || { c: c };
    r.bf = true; r.bfv = Number(t.volCurrency24h) * Number(t.last) / 1e6; r.bfl = (lev[t.instId] || {}).ml || ''; r.cls = (lev[t.instId] || {}).cls || r.cls; r.chg = (Number(t.last) / Number(t.open24h) - 1) * 100; });
  var wt = get(BOT.base + '/capi/v3/market/ticker/24hr'), wi = get(BOT.base + '/capi/v3/market/exchangeInfo').symbols || [], wmeta = {};
  wi.forEach(function (s) { wmeta[s.symbol] = s; });
  (wt || []).forEach(function (t) { var s = wmeta[t.symbol]; if (!s || s.quoteAsset != 'USDT') return; var c = s.baseAsset, r = M[c] = M[c] || { c: c };
    r.wx = true; r.wxv = Number(t.quoteVolume) / 1e6; r.wxl = s.maxLeverage; r.typ = s.underlyingType; if (r.chg == null) r.chg = Number(t.priceChangePercent) * 100; });
  var rows = Object.keys(M).map(function (k) { var r = M[k], tot = (r.bfv || 0) + (r.wxv || 0), crypto = (r.typ || 'COIN') == 'COIN' && (!r.cls || /crypto/i.test(r.cls));
    var cat = !crypto ? 'SKIP' : (r.wx && r.wxv >= 50) ? 'BOT' : (Math.max(r.bfv || 0, r.wxv || 0) >= 5) ? 'JACOB' : 'SKIP';
    var why = !crypto ? 'not crypto (' + (r.typ || r.cls) + ')' : cat == 'BOT' ? 'deep WEEX volume: fast setups OK' : cat == 'JACOB' ? 'enough volume for 4H/daily setups' : 'too thin (< $5M/day)';
    return [r.c, r.bf ? 'Y' : '', r.wx ? 'Y' : '', r.bfv != null ? Math.round(r.bfv * 10) / 10 : '', r.wxv != null ? Math.round(r.wxv * 10) / 10 : '', r.bfl || '', r.wxl || '', r.chg != null ? Math.round(r.chg * 10) / 10 : '', crypto ? 'crypto' : (r.typ || r.cls), cat, why, tot]; });
  rows.sort(function (a, b) { return b[11] - a[11]; }); rows = rows.map(function (r) { return r.slice(0, 11); });
  var ss = ss_(), sh = ss.getSheetByName('Coins') || ss.insertSheet('Coins'); sh.clear();
  var head = ['Coin', 'On BloFin', 'On WEEX', 'BloFin 24h vol $M', 'WEEX 24h vol $M', 'BloFin max lev', 'WEEX max lev', '24h %', 'Type', 'Category', 'Why'];
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold'); sh.setFrozenRows(1);
  if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
  var col = { BOT: '#b7e1cd', JACOB: '#fce8b2', SKIP: '#f4c7c3' };
  if (rows.length) sh.getRange(2, 10, rows.length, 1).setBackgrounds(rows.map(function (r) { return [col[r[9]]]; }));
  var n = { BOT: 0, JACOB: 0, SKIP: 0 }; rows.forEach(function (r) { n[r[9]]++; });
  log_('COINS', rows.length + ' coins: BOT ' + n.BOT + ', JACOB ' + n.JACOB + ', SKIP ' + n.SKIP);
  return { ok: true, total: rows.length, counts: n, both: rows.filter(function (r) { return r[1] && r[2]; }).length, top: rows.slice(0, 15).map(function (r) { return r[0] + ' ' + r[9]; }) };
}

// ---------------- Trade card "Buy" button: Jacob's tap IS the approval, so send straight to WEEX ----------------
// Margin is a flat $ amount (default $5, max $10); leverage is picked by the card so liquidation sits just under
// the 4H swing low / order block. The exchange stop goes just ABOVE liquidation so a stop-out costs less than a liquidation.
function buyNow_(q) {
  var coin = String(q.coin).toUpperCase().replace(/[^A-Z0-9]/g, ''), margin = Math.min(Number(q.margin) || 5, 10), lev = Math.round(Number(q.lev) || 0), stop = Number(q.stop);
  if (!(lev >= 2 && lev <= 50)) return { ok: false, err: 'Leverage must be 2-50x' };
  if (on_('Kill switch')) return { ok: false, err: 'Kill switch is ON' };
  var lk = LockService.getScriptLock(); lk.waitLock(20000);
  try {
    var px = priceNow_(coin); if (!(px > 0)) return { ok: false, err: 'No WEEX price for ' + coin };
    if (!(stop > 0 && stop < px)) return { ok: false, err: 'Stop must be below the price' };
    if ((px - stop) / px > 0.26) return { ok: false, err: 'Stop more than 26% away' };  // weekly cards use 8-25% supports
    var openN = rows_('Positions').filter(function (r) { return r[11] == 'OPEN' && r[10] != 'PAPER'; }).length;
    if (openN >= num_('Max open trades', 1, 20)) return { ok: false, err: 'Max open real trades reached' };
    var o = { id: 'CD' + Date.now().toString(36).toUpperCase() + coin, coin: coin, strategy: 'CARD', side: 'LONG', ref: px, stop: stop, margin: margin, lev: lev, why: 'Trade card: $' + margin + ' at ' + lev + 'x, ' + String(q.lvl || 'swing low').slice(0, 60), tag: 'JACOB-APPROVED' };
    o.qty = qty_(coin, margin * lev / px); if (!(o.qty > 0)) return { ok: false, err: 'Size below WEEX minimum for ' + coin };
    ss_().getSheetByName('Signals').appendRow([ct_(), coin, STRAT_NAMES.CARD, 'LONG', px, o.why, 'BUY (card)', '']);
    if (String(set_('Mode')).toUpperCase() == 'PAPER') { openPos_(o, px, 'PAPER', 'Card buy, paper mode'); return { ok: true, msg: 'Paper mode: practice fill ' + o.qty + ' ' + coin + ' @ $' + px }; }
    var res = sendLive_(o, 'APPROVED');
    return res.ok ? { ok: true, msg: 'Bought ' + o.qty + ' ' + coin + ' @ ~$' + px + ' (' + lev + 'x, stop $' + round_(stop) + '). ' + res.msg } : { ok: false, err: res.msg };
  } catch (e) { return { ok: false, err: e.message }; } finally { lk.releaseLock(); }
}

// ---------------- reconcile: trades WEEX closed on its own (stop hit, liquidation, or Jacob closed by hand) ----------------
function reconcile_() {
  if (!keys_()) return 0;
  var live = rows_('Positions').filter(function (r) { return r[10] == 'LIVE' && r[11] == 'OPEN'; }); if (!live.length) return 0;
  var pos = weex_('GET', '/capi/v3/account/position/allPosition', '', ''), list = Array.isArray(pos) ? pos : (pos && (pos.data || pos.positions)) || [];
  var have = {}; list.forEach(function (x) { if (Number(x.size) > 0) have[x.symbol + '|' + String(x.side).toUpperCase()] = 1; });
  var sh = ss_().getSheetByName('Positions'), ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(), n = 0;
  live.forEach(function (r) {
    if (have[r[1] + 'USDT|' + r[3]]) return;
    var row = -1; for (var i = 0; i < ids.length; i++) if (ids[i][0] == r[0]) row = i + 2; if (row < 0) return;
    var px = priceNow_(r[1]), side = r[3] == 'LONG' ? 1 : -1, stop = Number(r[9]);
    var hitStop = side > 0 ? px <= stop * 1.01 : px >= stop * 0.99, exit = hitStop ? stop : px;  // best guess of the fill; WEEX history has the exact one
    var pct = side * (exit / Number(r[5]) - 1) - BOT.fee, pnl = Number(r[7]) * Number(r[8]) * pct;
    sh.getRange(row, 12, 1, 7).setValues([['CLOSED', ct_(), exit, Math.round(pnl * 100) / 100, Math.round(pct * 10000) / 100 + '%', 'Closed on WEEX (' + (hitStop ? 'stop hit' : 'by hand or other') + ') - P&L estimated', '']]);
    log_('LIVE', 'Reconcile: ' + r[3] + ' ' + r[1] + ' no longer open on WEEX, marked closed (~$' + pnl.toFixed(2) + ')'); n++;
    notify_('LIVE: ' + r[1] + ' closed on WEEX', r[3] + ' ' + r[1] + ' is no longer open on WEEX (' + (hitStop ? 'stop hit' : 'closed by hand or other') + '). Est. P&L $' + pnl.toFixed(2) + '.');
  });
  return n;
}
// Run once from the editor: hourly scan -> every 15 minutes (exits, stops, approvals and reconcile checked 4x faster; heavy scans still only on new 4H candles)
function setTrigger15() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() == 'scan') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('scan').timeBased().everyMinutes(15).create();
  log_('SETUP', 'scan trigger now every 15 minutes');
}
function testReconcile() { Logger.log('closed ' + reconcile_()); }

// ---------------- take-profit ladder + trailing stop for Jacob's own trades (CARD / CHAT) ----------------
// Bot strategies keep their backtested exits. Jacob's trades: R = entry-to-stop distance.
// +1R: sell 25%, stop moves to breakeven (bot-side) | +2R: sell 25%, trail = high - 1R | +3R: sell 25% | last 25% rides the trail.
// The original exchange stop stays on WEEX as the backstop. Checked every 15 minutes.
function tpNote_(r) { try { var j = JSON.parse(String(r[18] || '{}')); return j && typeof j == 'object' ? j : {}; } catch (e) { return {}; } }
function manageTP_() {
  var sh = ss_().getSheetByName('Positions'), all = rows_('Positions');
  all.forEach(function (r, i) {
    if (r[10] != 'LIVE' || r[11] != 'OPEN' || (r[2] != 'CARD' && r[2] != 'CHAT')) return;
    var row = i + 2, side = r[3] == 'LONG' ? 1 : -1, entry = Number(r[5]), R = Math.abs(entry - Number(r[9])); if (!(R > 0)) return;
    var n = tpNote_(r), px = priceNow_(r[1]); n.s = n.s || 0; n.q0 = n.q0 || Number(r[6]); n.m0 = n.m0 || Number(r[7]); n.real = n.real || 0;
    n.hi = side > 0 ? Math.max(n.hi || entry, px) : Math.min(n.hi || entry, px);
    var gain = side * (px - entry) / R;
    var softStop = n.s >= 2 ? n.hi - side * R : n.s >= 1 ? entry : null;
    if (softStop != null && side * (px - softStop) <= 0) {   // trail / breakeven hit -> close the rest
      sh.getRange(row, 19).setValue(JSON.stringify(n)); r[18] = JSON.stringify(n);
      closePos_(r, null, n.s >= 2 ? 'Trailing stop (TP ladder)' : 'Breakeven stop after TP1', ''); return;
    }
    if (n.s < 3 && gain >= n.s + 1) {   // next take-profit reached: sell 25% of the original size
      var part = qty_(r[1], n.q0 * 0.25), left = Number(r[6]);
      if (part > 0 && part < left) {
        var res = weexClose_({ 0: r[0], 1: r[1], 3: r[3], 6: part, length: 7, _tag: 'T' + (n.s + 1) });
        if (!res.ok) { log_('ERROR', 'TP' + (n.s + 1) + ' ' + r[1] + ' failed: ' + res.msg); return; }
        var pct = side * (px / entry - 1) - BOT.fee, mPart = n.m0 * 0.25; n.real += mPart * Number(r[8]) * pct;
        sh.getRange(row, 7, 1, 2).setValues([[Math.round((left - part) * 1e8) / 1e8, Math.round((Number(r[7]) - mPart) * 1e4) / 1e4]]);
        log_('LIVE', 'TP' + (n.s + 1) + ' ' + r[1] + ': sold ' + part + ' @ ' + px + ' (+$' + (mPart * Number(r[8]) * pct).toFixed(2) + ')');
        notify_('TP' + (n.s + 1) + ' hit: ' + r[1], 'Sold 25% of ' + r[1] + ' at $' + px + '. ' + (n.s == 0 ? 'Stop now at breakeven.' : 'Trailing the rest 1R below the high.'));
      }
      n.s++;
    }
    sh.getRange(row, 19).setValue(JSON.stringify(n));
  });
}

// ---------------- Bets tab: read-only view of Jacob's NBA sheet (Kalshi) ----------------
var NBA_ID = '172p8NEQubZR94wgOM-l8CyDmHLd5kgJT03QpAxOU5eA';
function bets_() {
  var c = CacheService.getScriptCache(), hit = c.get('BETS2'); if (hit) return JSON.parse(hit);
  var out = { ok: true, at: ct_() };
  try {
    var ss = SpreadsheetApp.openById(NBA_ID), col = function (n, rng) { var sh = ss.getSheetByName(n); return sh ? sh.getRange(rng).getDisplayValues().map(function (r) { return r.filter(String).join(' | '); }).filter(String) : []; };
    out.live = col('Live_Positions', 'A1:A40');
    var m = String(out.live[0] || '').match(/cash \$([\d,.]+).*?open tickets (\d+).*?cost \$([\d,.]+)/i);
    if (m) { out.cash = Number(m[1].replace(/,/g, '')); out.openN = Number(m[2]); out.openCost = Number(m[3].replace(/,/g, '')); }
    out.score = col('Scoreboard', 'A1:A6');
    var bv = ss.getSheetByName('Blends_View'), v = bv ? bv.getRange('A1:G80').getDisplayValues() : [], pick = [], on = false;
    v.forEach(function (r) { var a = String(r[0]); if (/PICKED/.test(a) && /put \$/.test(a)) { on = true; pick.push(a); return; } if (on) { if (/^TOTAL/.test(a)) { pick.push(r.slice(0, 6).filter(String).join(' | ')); on = false; } else if (a && !/^Calculations|^Ticket$/.test(a)) pick.push(r.slice(0, 6).filter(String).join(' | ')); } });
    out.blendAt = String((v[0] || [''])[0]).slice(0, 80); out.pick = pick;
  } catch (e) { out.ok = false; out.err = e.message; }
  try { c.put('BETS2', JSON.stringify(out), 300); } catch (e) { }
  return out;
}

// Liquid coins for the app's scanners: BOT + JACOB category coins that trade on BloFin (scanners read BloFin candles)
function liq_() {
  var sh = ss_().getSheetByName('Coins'); if (!sh || sh.getLastRow() < 2) return { ok: false };
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  return { ok: true, coins: rows.filter(function (r) { return r[1] == 'Y' && (r[9] == 'BOT' || r[9] == 'JACOB'); }).map(function (r) { return { c: r[0], cat: r[9] }; }) };
}

// ---------------- Server browser mailbox (VPS worker polls here) ----------------
// Claude writes rows to the "Browser" tab: [id, command JSON, NEW]. The VPS worker picks up NEW rows, runs them, writes the result back.
function rbSheet_() {
  var ss = ss_(), sh = ss.getSheetByName('Browser');
  if (!sh) { sh = ss.insertSheet('Browser'); sh.getRange(1, 1, 1, 5).setValues([['ID', 'Command (JSON)', 'Status', 'Result', 'Updated (CT)']]).setFontWeight('bold'); sh.setFrozenRows(1); sh.setColumnWidth(2, 420); sh.setColumnWidth(4, 640); }
  return sh;
}
function doPost(e) {
  var b = {}; try { b = JSON.parse(e.postData.contents); } catch (x) { }
  var k = PropertiesService.getScriptProperties().getProperty('RB_KEY');
  if (!k || b.key !== k) return json_({ ok: false, err: 'key' });
  var lk = LockService.getDocumentLock(); lk.waitLock(15000); // own lock: never blocks the 15-min scan
  try {
    var sh = rbSheet_();
    if (b.rb == 'poll') {
      var n = sh.getLastRow(), out = []; if (n < 2) return json_({ ok: true, cmds: [] });
      var v = sh.getRange(2, 1, n - 1, 3).getValues();
      for (var i = 0; i < v.length && out.length < 5; i++) if (String(v[i][2]).toUpperCase() == 'NEW') { out.push({ row: i + 2, id: String(v[i][0]), cmd: String(v[i][1]) }); sh.getRange(i + 2, 3, 1, 3).setValues([['RUNNING', '', ct_()]]); }
      PropertiesService.getScriptProperties().setProperty('RB_SEEN', String(Date.now()));
      return json_({ ok: true, cmds: out });
    }
    if (b.rb == 'done' && Number(b.row) >= 2) { sh.getRange(Number(b.row), 3, 1, 3).setValues([[b.ok ? 'DONE' : 'ERROR', String(b.result || '').slice(0, 49000), ct_()]]); return json_({ ok: true }); }
    return json_({ ok: false, err: 'bad request' });
  } finally { lk.releaseLock(); }
}
