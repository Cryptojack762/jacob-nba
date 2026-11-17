/**
 * K-Saju backend (Google Apps Script web app).
 * Jobs: waitlist emails, funnel step counts, Stripe Checkout, paid-reading delivery (Claude API + email).
 *
 * One-time setup:
 *  1. Run setup() once (creates the "K-Saju Data" sheet).
 *  2. Project Settings > Script Properties, add:
 *       SITE_URL        e.g. https://cryptojack762.github.io/jacob-nba/ksaju/
 *       STRIPE_SECRET   sk_test_... (test mode first, sk_live_... at launch)
 *       ANTHROPIC_KEY   sk-ant-...
 *     Optional: MODEL (default claude-sonnet-5-5), BRAND (default K-Saju), REPLY_TO (support email)
 *  3. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 *  4. Paste the web app URL into js/config.js (SITE.api).
 * Secret keys live only here, never in the website.
 */

var PRODUCTS = {
  year2027: { name: '2027 Year Ahead + Love Reading', cents: 1499 }
};

function P_(k, d) { return PropertiesService.getScriptProperties().getProperty(k) || d || ''; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.openById(P_('SHEET_ID')); }

function setup() {
  var id = P_('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('K-Saju Data');
  var tabs = {
    Waitlist: ['time', 'email', 'day_master', 'title', 'strongest', 'source'],
    Orders: ['time', 'order_id', 'status', 'product', 'email', 'stripe_session', 'token', 'chart_json', 'reading', 'emailed', 'error'],
    Events: ['time', 'step', 'source']
  };
  Object.keys(tabs).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() == 0) sh.appendRow(tabs[n]);
    sh.setFrozenRows(1);
  });
  var s1 = ss.getSheetByName('Sheet1'); if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  Logger.log('Data sheet: ' + ss.getUrl());
  return ss.getUrl();
}

function doGet() { return out_({ ok: true, service: 'k-saju', time: new Date().toISOString() }); }

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, err: 'bad request' }); }
  try {
    if (b.action == 'waitlist') return out_(waitlist_(b));
    if (b.action == 'event') return out_(event_(b));
    if (b.action == 'checkout') return out_(checkout_(b));
    if (b.action == 'reading') return out_(reading_(b));
    return out_({ ok: false, err: 'unknown action' });
  } catch (x) {
    console.error(x);
    return out_({ ok: false, err: 'Server error. Please try again.' });
  }
}

// ---------- waitlist + funnel counts ----------
function clean_(s, n) { return String(s == null ? '' : s).replace(/[\r\n\t]/g, ' ').slice(0, n || 120); }
function waitlist_(b) {
  var em = clean_(b.email, 200).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, err: 'invalid email' };
  var sh = ss_().getSheetByName('Waitlist');
  var last = sh.getLastRow();
  if (last > 1 && sh.getRange(2, 2, last - 1, 1).getValues().some(function (r) { return r[0] == em; })) return { ok: true, dup: true };
  sh.appendRow([new Date(), em, clean_(b.dm), clean_(b.title), clean_(b.element), clean_(b.src, 40)]);
  return { ok: true };
}
function event_(b) {
  var ok = ['landing', 'free_chart', 'waitlist', 'checkout', 'paid', 'share_card', 'invite'];
  if (ok.indexOf(b.step) < 0) return { ok: false };
  ss_().getSheetByName('Events').appendRow([new Date(), b.step, clean_(b.src, 40)]);
  return { ok: true };
}

// ---------- Stripe ----------
function stripe_(method, path, params) {
  var key = P_('STRIPE_SECRET'); if (!key) throw new Error('STRIPE_SECRET not set');
  var opt = { method: method, headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true };
  if (params) opt.payload = params;
  var r = UrlFetchApp.fetch('https://api.stripe.com/v1' + path, opt);
  var j = JSON.parse(r.getContentText());
  if (r.getResponseCode() >= 300) throw new Error('Stripe: ' + (j.error && j.error.message));
  return j;
}

function checkout_(b) {
  var prod = PRODUCTS[b.product]; if (!prod) return { ok: false, err: 'unknown product' };
  if (!b.chart || !b.chart.dayMaster) return { ok: false, err: 'missing chart' };
  var site = P_('SITE_URL'); if (!site) throw new Error('SITE_URL not set');
  var orderId = Utilities.getUuid(), token = Utilities.getUuid().replace(/-/g, '');
  var chart = JSON.stringify(b.chart).slice(0, 40000);
  var s = stripe_('post', '/checkout/sessions', {
    'mode': 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': prod.name,
    'line_items[0][price_data][unit_amount]': String(prod.cents),
    'line_items[0][quantity]': '1',
    'allow_promotion_codes': 'true',
    'client_reference_id': orderId,
    'metadata[order_id]': orderId,
    'success_url': site + 'reading.html?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url': site
  });
  ss_().getSheetByName('Orders').appendRow([new Date(), orderId, 'created', b.product, '', s.id, token, chart, '', '', '']);
  return { ok: true, url: s.url };
}

// ---------- paid reading ----------
function findOrder_(col, val) {
  var sh = ss_().getSheetByName('Orders'), n = sh.getLastRow();
  if (n < 2) return null;
  var v = sh.getRange(2, 1, n - 1, 11).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (v[i][col] == val) return { row: i + 2, v: v[i], sh: sh };
  return null;
}

function reading_(b) {
  var o;
  if (b.token) {
    o = findOrder_(6, String(b.token));
    if (!o || !o.v[8]) return { ok: false, err: 'Reading not found.' };
    return { ok: true, reading: o.v[8], title: titleFor_(o.v[7]), token: o.v[6] };
  }
  var sid = String(b.session_id || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { ok: false, err: 'Invalid link.' };
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    o = findOrder_(5, sid);
    if (!o) return { ok: false, err: 'Order not found.' };
    if (o.v[8]) return { ok: true, reading: o.v[8], title: titleFor_(o.v[7]), token: o.v[6] };
    var s = stripe_('get', '/checkout/sessions/' + sid);
    if (s.payment_status != 'paid') return { ok: false, err: 'Payment not completed yet.' };
    var email = (s.customer_details && s.customer_details.email) || '';
    o.sh.getRange(o.row, 3, 1, 3).setValues([['paid', o.v[3], email]]);
    event_({ step: 'paid', src: '' });
    var text;
    try { text = writeReading_(JSON.parse(o.v[7])); }
    catch (x) { o.sh.getRange(o.row, 11).setValue(String(x)); throw x; }
    o.sh.getRange(o.row, 3).setValue('delivered');
    o.sh.getRange(o.row, 9).setValue(text);
    try { emailReading_(email, o.v[6], text, JSON.parse(o.v[7])); o.sh.getRange(o.row, 10).setValue(new Date()); }
    catch (x) { o.sh.getRange(o.row, 11).setValue('email: ' + x); }
    return { ok: true, reading: text, title: titleFor_(o.v[7]), token: o.v[6] };
  } finally { lock.releaseLock(); }
}

function titleFor_(chartJson) {
  try { var c = JSON.parse(chartJson); return 'Your 2027, ' + c.dayMaster.title + ' (' + c.dayMaster.hanja + ')'; } catch (x) { return 'Your 2027 reading'; }
}

// ---------- Layer 2: AI writes from the chart (the math is already done) ----------
var ELS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
// Ten-God family of an element relative to the Day Master element (deterministic, not left to the AI).
function relation_(dmEl, el) {
  var d = (ELS.indexOf(el) - ELS.indexOf(dmEl) + 5) % 5;
  return ['Companion (peers, self, competition)', 'Output (creativity, expression, fun)', 'Wealth (money, opportunities; for men also romance)', 'Power (career, status, pressure; for women also romance)', 'Resource (support, learning, rest)'][d];
}
var MONTHS_2027 = [ // solar months of the 丁未 year (Tiger month starts at Ipchun, Feb 4 2027)
  ['Feb 4 - Mar 5', '壬寅', 'Water', 'Wood'], ['Mar 6 - Apr 4', '癸卯', 'Water', 'Wood'], ['Apr 5 - May 5', '甲辰', 'Wood', 'Earth'],
  ['May 6 - Jun 5', '乙巳', 'Wood', 'Fire'], ['Jun 6 - Jul 6', '丙午', 'Fire', 'Fire'], ['Jul 7 - Aug 7', '丁未', 'Fire', 'Earth'],
  ['Aug 8 - Sep 7', '戊申', 'Earth', 'Metal'], ['Sep 8 - Oct 8', '己酉', 'Earth', 'Metal'], ['Oct 9 - Nov 7', '庚戌', 'Metal', 'Earth'],
  ['Nov 8 - Dec 6', '辛亥', 'Metal', 'Water'], ['Dec 7 - Jan 5', '壬子', 'Water', 'Water'], ['Jan 6 - Feb 3 2028', '癸丑', 'Water', 'Earth']
];

var SYSTEM_PROMPT = [
  'You are Haneul, a warm Korean saju (사주) reader writing in natural, modern English for young adults who are curious about Korean culture.',
  'You receive a birth chart that has already been calculated exactly. Never recalculate, change or invent pillars, elements or dates. Use only the facts given.',
  'Write the reader a personal "2027 Year Ahead + Love" reading.',
  'Format: plain text with these exact section headings, each starting with "## ":',
  '## Your 2027 at a glance / ## Love & relationships / ## Career & money / ## Your best months / ## A note to carry with you',
  'Length: 850 to 1,050 words. Short paragraphs. Speak directly to the reader ("you"). Mention their Day Master by its English name and Hanja once or twice, and explain any Korean or Hanja term in plain English the first time.',
  'Tone: encouraging, specific, grounded, self-discovery. Frame everything as tendencies, energies and invitations, never certainties.',
  'Hard rules (never break): no fear-based or threatening language; no guaranteed outcomes or exact predictions (no "you will meet your soulmate in March", "you will get rich"); no health, medical, legal, investment or gambling advice; never tell the reader to stay in or leave a relationship; no celebrity or K-pop idol names; no mention of death, illness, accidents or curses.',
  'In "Your best months", pick 3 to 4 months from the provided month list that suit the chart best and say why in one or two sentences each, using the given relationships.',
  'End with exactly this line on its own: "For entertainment and self-reflection. Not a substitute for professional advice."'
].join('\n');

function chartBrief_(c) {
  var dm = c.dayMaster, el = dm.element, P = c.pillars;
  var pil = function (k) { var p = P[k]; return p ? (p.hanja + ' (' + p.stem.element + ' ' + (p.stem.yang ? 'yang' : 'yin') + ' over ' + p.branch.element + ' ' + p.branch.animal + ')') : 'unknown (birth time not given)'; };
  var lines = [
    'Day Master: ' + dm.hanja + ' ' + dm.label + ', "' + dm.title + '" (' + dm.tag + ')',
    'Pillars: year ' + pil('year') + '; month ' + pil('month') + '; day ' + pil('day') + '; hour ' + pil('hour'),
    'Five-element balance: ' + ELS.map(function (e) { return e + ' ' + c.elements.pct[e] + '%'; }).join(', ') + '. Strongest: ' + c.elements.strongest + '. Missing: ' + (c.elements.missing.join(', ') || 'none'),
    'Zodiac year: ' + c.animal.color + ' ' + c.animal.name,
    'Gender given: ' + (c.input.gender || 'not given'),
    'Current 10-year luck pillar: ' + (c.luck && c.luck.current ? c.luck.current.hanja + ' (' + c.luck.current.stem.element + ' over ' + c.luck.current.branch.element + '), ages ' + c.luck.current.age + '-' + c.luck.current.ageEnd + '; relationship to Day Master: ' + relation_(el, c.luck.current.stem.element) : 'not available'),
    '',
    'The year 2027 is 丁未, the Red Goat year: Yin Fire over Earth. For this Day Master, Fire = ' + relation_(el, 'Fire') + '; Earth = ' + relation_(el, 'Earth') + '.',
    'The saju year 2027 starts at Ipchun, February 4 2027.',
    '2027 solar months (dates approximate):',
  ];
  MONTHS_2027.forEach(function (m) { lines.push('- ' + m[0] + ': ' + m[1] + ' (' + m[2] + ' over ' + m[3] + ') -> stem = ' + relation_(el, m[2]).split(' (')[0] + ', branch = ' + relation_(el, m[3]).split(' (')[0]); });
  return lines.join('\n');
}

function writeReading_(chart) {
  var key = P_('ANTHROPIC_KEY'); if (!key) throw new Error('ANTHROPIC_KEY not set');
  var body = {
    model: P_('MODEL', 'claude-sonnet-5-5'), max_tokens: 2200, system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: 'Here is the calculated chart. Write the reading.\n\n' + chartBrief_(chart) }]
  };
  var r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, payload: JSON.stringify(body)
  });
  var j = JSON.parse(r.getContentText());
  if (r.getResponseCode() >= 300) throw new Error('AI: ' + (j.error && j.error.message));
  var text = (j.content || []).filter(function (x) { return x.type == 'text'; }).map(function (x) { return x.text; }).join('\n').trim();
  if (text.length < 1500) throw new Error('AI reading too short');
  if (text.indexOf('For entertainment and self-reflection') < 0) text += '\n\nFor entertainment and self-reflection. Not a substitute for professional advice.';
  return text;
}

function emailReading_(to, token, text, chart) {
  if (!to) return;
  var brand = P_('BRAND', 'K-Saju'), link = P_('SITE_URL') + 'reading.html?r=' + token;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var html = text.split(/\n+/).map(function (l) {
    l = l.trim(); if (!l) return '';
    return /^#+\s/.test(l) ? '<h3 style="color:#a8792b;margin:22px 0 6px">' + esc(l.replace(/^#+\s*/, '')) + '</h3>' : '<p style="line-height:1.6;margin:0 0 12px">' + esc(l) + '</p>';
  }).join('');
  var opt = {
    to: to, name: brand, subject: 'Your 2027 reading: ' + chart.dayMaster.title + ' (' + chart.dayMaster.hanja + ')',
    htmlBody: '<div style="font-family:Arial,sans-serif;max-width:600px;color:#222">' + html +
      '<p><a href="' + link + '">Open your reading online</a></p>' +
      '<p style="color:#888;font-size:12px">You received this because you bought a reading from ' + brand + '. Reply to this email for help or to delete your data.</p></div>'
  };
  if (P_('REPLY_TO')) opt.replyTo = P_('REPLY_TO');
  MailApp.sendEmail(opt);
}

// ---------- tests you can run from the editor ----------
function testPrompt() { Logger.log(chartBrief_(SAMPLE_())); }
function testAI() { Logger.log(writeReading_(SAMPLE_())); }
function SAMPLE_() {
  return {
    input: { gender: 'female' },
    dayMaster: { hanja: '丙', label: 'Yang Fire', title: 'The Sun', tag: 'Warm, generous, impossible to ignore.', element: 'Fire', yang: true },
    pillars: {
      year: { hanja: '庚午', stem: { element: 'Metal', yang: true }, branch: { element: 'Fire', animal: 'Horse' } },
      month: { hanja: '辛巳', stem: { element: 'Metal', yang: false }, branch: { element: 'Fire', animal: 'Snake' } },
      day: { hanja: '丙辰', stem: { element: 'Fire', yang: true }, branch: { element: 'Earth', animal: 'Dragon' } },
      hour: null
    },
    elements: { pct: { Wood: 0, Fire: 50, Earth: 17, Metal: 33, Water: 0 }, strongest: 'Fire', missing: ['Wood', 'Water'] },
    animal: { color: 'White', name: 'Horse' },
    luck: { current: { hanja: '甲申', age: 27, ageEnd: 36, stem: { element: 'Wood' }, branch: { element: 'Metal' } } }
  };
}
