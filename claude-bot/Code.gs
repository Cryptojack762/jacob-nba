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
];
var STRAT_NAMES = { L_TPI: 'TPI breakout long', L_ST: 'SuperTrend long', S_FUND: 'Funding-extreme short', S_BBRSI: 'BB + RSI short', L_FUND: 'Funding-extreme long', S_BTCFLIP: 'BTC-breakdown short', M_BOTTOM: 'Market-bottom long', L_RSI20: 'Washout bounce long' };
var TABS = {
  Signals: ['Time (CT)', 'Coin', 'Strategy', 'Side', 'Price', 'Why', 'Action', 'Claude notes'],
  Orders: ['ID', 'Time (CT)', 'Coin', 'Strategy', 'Side', 'Qty', 'Ref price', 'Protective stop', 'Margin $', 'Leverage', 'Status', 'Token', 'Result', 'Claude notes'],
  Positions: ['ID', 'Coin', 'Strategy', 'Side', 'Opened (CT)', 'Entry', 'Qty', 'Margin $', 'Leverage', 'Stop', 'Mode', 'Status', 'Closed (CT)', 'Exit', 'P&L $', 'P&L %', 'Exit reason', 'Bars held', 'Claude notes'],
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
  var raw = get_('/capi/v3/market/klines?symbol=' + coin + 'USDT&interval=4h&limit=500'), now = Date.now();
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
  var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return;
  try {
    var p = PropertiesService.getScriptProperties();
    var btcD = candles_('BTC'), lastBar = btcD[btcD.length - 1].t;
    var newBar = String(lastBar) != p.getProperty('LAST_BAR');
    var be = ema_(btcD.map(function (x) { return x.c; }), 200), nB = btcD.length, btcUp = btcD[nB - 1].c > be[nB - 1];
    var btcFlipDown = !btcUp && btcD[nB - 2].c > be[nB - 2];
    expireApprovals_();
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
  var action = kill ? 'Skipped: kill switch ON' : openN >= num_('Max open trades', 1, 20) ? 'Skipped: max open trades' : mode;
  ss_().getSheetByName('Signals').appendRow([ct_(), coin, STRAT_NAMES[sig.strategy], sig.side, x.c, sig.why, action, '']);
  if (action.indexOf('Skipped') === 0) return;
  var lev = num_('Leverage', 1, 5), margin = equity_() * num_('Margin per trade %', 1, 50) / 100;
  var sa = sig.stopAtr || num_('Protective stop (ATR x)', 1, 10), stop = sig.side == 'LONG' ? x.c - sa * x.atr : x.c + sa * x.atr;
  var o = { id: 'CB' + Date.now().toString(36).toUpperCase() + coin, coin: coin, strategy: sig.strategy, side: sig.side, ref: x.c, stop: stop, margin: margin, lev: lev, why: sig.why };
  o.qty = qty_(coin, margin * lev / x.c);
  if (!(o.qty > 0)) { log_('SKIP', coin + ' size below the exchange minimum'); return; }
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
  ss_().getSheetByName('Positions').appendRow([o.id, o.coin, o.strategy, o.side, new Date().toISOString(), fill, o.qty, round_(o.margin), o.lev, round_(o.stop), mode, 'OPEN', '', '', '', '', '', '', '']);
  log_(mode, note + ': ' + o.side + ' ' + o.qty + ' ' + o.coin + ' @ ' + fill + ' (' + STRAT_NAMES[o.strategy] + ')');
  notify_(mode + ': ' + o.side + ' ' + o.coin + ' opened', o.side + ' ' + o.qty + ' ' + o.coin + ' at $' + fill + ', margin $' + round_(o.margin) + ' at ' + o.lev + 'x, stop $' + round_(o.stop) + '.\nWhy: ' + o.why);
}
function closePos_(r, exitPrice, reason, bars) {
  var sh = ss_().getSheetByName('Positions'), all = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues(), row = -1;
  for (var i = 0; i < all.length; i++) if (all[i][0] == r[0]) row = i + 2;
  if (row < 0) return;
  var side = r[3] == 'LONG' ? 1 : -1, px = exitPrice || priceNow_(r[1]);
  if (r[10] == 'LIVE' && !exitPrice) { var res = weexClose_(r); if (!res.ok) { log_('ERROR', 'Close ' + r[1] + ' failed: ' + res.msg + ' - close it by hand on WEEX'); notify_('CLOSE FAILED ' + r[1], 'The bot could not close ' + r[1] + ': ' + res.msg + '. Close it by hand on WEEX.'); return; } }
  var pct = side * (px / Number(r[5]) - 1) - BOT.fee, pnl = Number(r[7]) * Number(r[8]) * pct;
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
    try { weex_('POST', '/capi/v3/account/leverage', '', JSON.stringify(o.side == 'LONG' ? { symbol: o.coin + 'USDT', marginType: 'ISOLATED', isolatedLongLeverage: String(lev) } : { symbol: o.coin + 'USDT', marginType: 'ISOLATED', isolatedShortLeverage: String(lev) })); } catch (e) { log_('WARN', 'leverage ' + o.coin + ': ' + e.message); }
    var body = { symbol: o.coin + 'USDT', side: o.side == 'LONG' ? 'BUY' : 'SELL', positionSide: o.side, type: 'MARKET', quantity: String(o.qty), newClientOrderId: o.id, slTriggerPrice: priceStr_(o.coin, o.stop), SlWorkingType: 'MARK_PRICE', reduceOnly: false };
    var res = weex_('POST', '/capi/v3/order', '', JSON.stringify(body));
    if (!res.success) throw new Error(res.errorCode + ' ' + res.errorMessage);
    openPos_(o, priceNow_(o.coin), 'LIVE', how + ' order sent (WEEX order ' + res.orderId + ')');
    return { ok: true, msg: 'Order ' + res.orderId };
  } catch (e) { log_('ERROR', 'Send ' + o.coin + ': ' + e.message); notify_('ORDER FAILED ' + o.coin, e.message); return { ok: false, msg: e.message }; }
}
function weexClose_(r) {
  try {
    var body = { symbol: r[1] + 'USDT', side: r[3] == 'LONG' ? 'SELL' : 'BUY', positionSide: r[3], type: 'MARKET', quantity: String(r[6]), newClientOrderId: 'X' + r[0].slice(0, 30), reduceOnly: true };
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
  rows_('Orders').forEach(function (r, i) { if (r[10] == 'PENDING') { var ts = parseInt(String(r[0]).slice(2, -String(r[2]).length), 36); if (isFinite(ts) && now - ts > mins * 60e3) setOrder_(i + 2, 'EXPIRED', 'Not approved in time'); } });
}

// ---------------- notifications ----------------
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
    if (q.set == 'kill') setVal_('Kill switch', q.v == 'ON' ? 'ON' : 'OFF');
    if (q.set == 'mode' && /^(PAPER|APPROVE|AUTO)$/.test(q.v)) setVal_('Mode', q.v);
    if (q.set == 'close' && q.id) {   // Jacob's "close now" button in the app (market close; live trades close on WEEX)
      var lk = LockService.getScriptLock(); lk.waitLock(20000);
      try { var pr = rowsRaw_('Positions').filter(function (r) { return r[0] == q.id && r[11] == 'OPEN'; })[0]; if (pr) closePos_(pr, null, 'Closed from app', ''); } finally { lk.releaseLock(); }
      CacheService.getScriptCache().remove('LIVE');
    }
    return json_({ ok: true, status: ss_().getSheetByName('Home').getRange(2, 2).getValue(), mode: set_('Mode'), kill: set_('Kill switch'), equity: equity_(),
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
