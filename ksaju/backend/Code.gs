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
 *  5. Daily emails: run installTriggers() once (sends each subscriber's reading at their chosen hour).
 *     Optional properties: CHAT_FREE (default 1 free Haneul answer per phone), CHAT_DAILY_CAP (default 300 answers/day, protects the AI bill),
 *     MAIL_FOOTER (your mailing address line, needed for US email law before marketing emails).
 */

var PRODUCTS = {
  year2027: { name: '2027 Year Ahead + Love Reading', cents: 1499 },
  compat: { name: 'Compatibility Reading', cents: 1999 },
  bundle: { name: 'Compatibility + 2027 Year Ahead Bundle', cents: 2999 },
  // Added 11/19 (placeholders until Jacob + Dustin approve prices; fulfilment not built yet)
  q_money: { name: 'Money Reading', cents: 499 }, q_career: { name: 'Career Reading', cents: 499 },
  q_love: { name: 'Love Reading', cents: 499 }, q_dates: { name: 'Lucky Dates (3 months)', cents: 499 },
  couple: { name: 'Couple Report', cents: 2999 }, gift: { name: 'Gift Reading', cents: 1499 }, chat10: { name: '10 Haneul Answers', cents: 499 }
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
    Events: ['time', 'step', 'source'],
    Daily: ['time', 'email', 'send_time', 'tz', 'dm_element', 'dm_hanja', 'dm_title', 'day_branch', 'token', 'active', 'last_sent'],
    Chat: ['time', 'device', 'question', 'answer']
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

function doGet(e) {
  var t = e && e.parameter && e.parameter.unsub;
  if (t) { unsub_(t); return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:30px">You are unsubscribed from K-Saju daily emails.</p>'); }
  return out_({ ok: true, service: 'k-saju', time: new Date().toISOString() });
}

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, err: 'bad request' }); }
  try {
    if (b.action == 'waitlist') return out_(waitlist_(b));
    if (b.action == 'event') return out_(event_(b));
    if (b.action == 'checkout') return out_(checkout_(b));
    if (b.action == 'reading') return out_(reading_(b));
    if (b.action == 'daily_signup') return out_(dailySignup_(b));
    if (b.action == 'ask') return out_(ask_(b));
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
  var ok = ['landing', 'free_chart', 'waitlist', 'checkout', 'paid', 'share_card', 'invite', 'compat'];
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
  var site = P_('SITE_URL', 'https://cryptojack762.github.io/jacob-nba/ksaju/'); if (!site) throw new Error('SITE_URL not set');
  var orderId = Utilities.getUuid(), token = Utilities.getUuid().replace(/-/g, '');
  if ((b.product == 'compat' || b.product == 'bundle') && !b.partner) return { ok: false, err: 'missing partner' };
  var chart = JSON.stringify(b.partner ? { chart: b.chart, partner: b.partner } : b.chart).slice(0, 45000);
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
    try { text = writeFor_(o.v[3], JSON.parse(o.v[7])); }
    catch (x) { o.sh.getRange(o.row, 11).setValue(String(x)); throw x; }
    o.sh.getRange(o.row, 3).setValue('delivered');
    o.sh.getRange(o.row, 9).setValue(text);
    try { var d0 = JSON.parse(o.v[7]); emailReading_(email, o.v[6], text, d0.chart || d0, o.v[3]); o.sh.getRange(o.row, 10).setValue(new Date()); }
    catch (x) { o.sh.getRange(o.row, 11).setValue('email: ' + x); }
    return { ok: true, reading: text, title: titleFor_(o.v[7]), token: o.v[6] };
  } finally { lock.releaseLock(); }
}

function titleFor_(chartJson) {
  try { var d = JSON.parse(chartJson); if (d.partner) return 'Your compatibility reading'; return 'Your 2027, ' + d.dayMaster.title + ' (' + d.dayMaster.hanja + ')'; } catch (x) { return 'Your reading'; }
}

// ---------- Layer 2: AI writes from the chart (the math is already done) ----------
var ELS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
// Ten-God family of an element relative to the Day Master element (deterministic, not left to the AI).
function relation_(dmEl, el) {
  var d = (ELS.indexOf(el) - ELS.indexOf(dmEl) + 5) % 5;
  return ['Companion (peers, self, competition)', 'Output (creativity, expression, fun)', 'Wealth (money, opportunities)', 'Power (career, status, pressure)', 'Resource (support, learning, rest)'][d];
}
// Partner star (Dustin fix 1, Nov 17): women = Power (관성, the element that controls the Day Master); men = Wealth (재성, the element the Day Master controls).
// No gender = no partner-star logic.
function partnerStar_(dmEl, gender) {
  var i = ELS.indexOf(dmEl);
  if (gender == 'female') return { el: ELS[(i + 3) % 5], name: 'Power (관성)' };
  if (gender == 'male') return { el: ELS[(i + 2) % 5], name: 'Wealth (재성)' };
  return null;
}
// Solar months of the 丁未 year. Dates are exact solar-term starts in Korea time (KST), computed with the same
// manseryeok library as the chart engine (Dustin fix 2, Nov 17): Ipchun Feb 4 10:46, Hallo Oct 8 21:17, Ipdong Nov 8 00:39, Sohan Jan 6 2028 04:55.
// Each saju month runs from its start date to the day before the next one. [label, dates, pillar, stem element, branch element]
var MONTHS_2027 = [
  ['February', 'Feb 4 - Mar 5', '壬寅', 'Water', 'Wood'], ['March', 'Mar 6 - Apr 4', '癸卯', 'Water', 'Wood'], ['April', 'Apr 5 - May 5', '甲辰', 'Wood', 'Earth'],
  ['May', 'May 6 - Jun 5', '乙巳', 'Wood', 'Fire'], ['June', 'Jun 6 - Jul 6', '丙午', 'Fire', 'Fire'], ['July', 'Jul 7 - Aug 7', '丁未', 'Fire', 'Earth'],
  ['August', 'Aug 8 - Sep 7', '戊申', 'Earth', 'Metal'], ['September', 'Sep 8 - Oct 7', '己酉', 'Earth', 'Metal'], ['October', 'Oct 8 - Nov 7', '庚戌', 'Metal', 'Earth'],
  ['November', 'Nov 8 - Dec 6', '辛亥', 'Metal', 'Water'], ['December', 'Dec 7 - Jan 5, 2028', '壬子', 'Water', 'Water'], ['January 2028', 'Jan 6 - Feb 3, 2028', '癸丑', 'Water', 'Earth']
];
function monthTag_(m) { return m[0] + ' ' + m[2] + ' (about ' + m[1] + ')'; }

var SYSTEM_PROMPT = [
  'You are Haneul, a warm Korean saju (사주) reader writing in natural, modern English for young adults who are curious about Korean culture.',
  'You receive a birth chart that has already been calculated exactly. Never recalculate, change or invent pillars, elements or dates. Use only the facts given.',
  'Write the reader a personal "2027 Year Ahead + Love" reading.',
  'Format: plain text with these exact section headings, each starting with "## ":',
  '## Your 2027 at a glance / ## Love & relationships / ## Career & money / ## Your best months / ## A note to carry with you',
  'Length: 850 to 1,050 words. Short paragraphs. Speak directly to the reader ("you"). Mention their Day Master by its English name and Hanja once or twice, and explain any Korean or Hanja term in plain English the first time.',
  'Tone: encouraging, specific, grounded, self-discovery. Frame everything as tendencies, energies and invitations, never certainties.',
  'Hard rules (never break): no fear-based or threatening language; no guaranteed outcomes or exact predictions (no "you will meet your soulmate in March", "you will get rich"); no health, medical, legal, investment or gambling advice; never tell the reader to stay in or leave a relationship; no celebrity or K-pop idol names; no mention of death, illness, accidents or curses.',
  'In "Your best months", pick 3 to 4 months from the provided month list that suit the chart best and say why in one or two sentences each, using the given relationships. Saju months do not match calendar months, so always name a month exactly as its label is given, with its Hanja and dates, for example "August 戊申 (about Aug 8 - Sep 7)". Never write a bare calendar month.',
  'Love and romance: use ONLY the partner star given in the chart brief (for women it is Power 관성, for men it is Wealth 재성) and the months listed as carrying it. If the brief says no gender was given, do not use any partner-star or romance-star logic at all; describe love only through the Day Master\'s nature and the year\'s energy.',
  'Persona: you are Haneul, a young male 선비 (seonbi, a Korean scholar) in a black 갓 (gat, the traditional horsehair hat) who carries a 태극 (taegeuk) fan. You are warm, calm and a bit of a star nerd.',
  'Include exactly one Korean cultural touch somewhere in the reading, explained in one or two plain sentences (for example: Koreans hang 입춘대길 "great luck at the start of spring" notes on their doors at Ipchun; families check the year ahead around Seollal, the Lunar New Year). Do not invent customs.',
  '"## A note to carry with you" ends with a short signature in Haneul\'s voice, one or two sentences, then a line with only: "— Haneul".',
  'End with exactly this line on its own, after the signature: "For entertainment and self-reflection. Not a substitute for professional advice."'
].join('\n');

function chartBrief_(c) {
  var dm = c.dayMaster, el = dm.element, P = c.pillars, ps = partnerStar_(el, c.input && c.input.gender);
  var pil = function (k) { var p = P[k]; return p ? (p.hanja + ' (' + p.stem.element + ' ' + (p.stem.yang ? 'yang' : 'yin') + ' over ' + p.branch.element + ' ' + p.branch.animal + ')') : 'unknown (birth time not given)'; };
  var lines = [
    'Day Master: ' + dm.hanja + ' ' + dm.label + ', "' + dm.title + '" (' + dm.tag + ')',
    'Pillars: year ' + pil('year') + '; month ' + pil('month') + '; day ' + pil('day') + '; hour ' + pil('hour'),
    'Five-element balance: ' + ELS.map(function (e) { return e + ' ' + c.elements.pct[e] + '%'; }).join(', ') + '. Strongest: ' + c.elements.strongest + '. Missing: ' + (c.elements.missing.join(', ') || 'none'),
    'Zodiac year: ' + c.animal.color + ' ' + c.animal.name,
    'Gender given: ' + (c.input.gender || 'not given'),
    (ps ? 'Partner star (romance signal) for this ' + c.input.gender + ' reader: ' + ps.name + ' = ' + ps.el + '. 2027 months carrying ' + ps.el + ': ' + (MONTHS_2027.filter(function (m) { return m[3] == ps.el || m[4] == ps.el; }).map(monthTag_).join('; ') || 'none') + (ps.el == 'Fire' || ps.el == 'Earth' ? '. The 2027 year itself (丁未, Fire over Earth) also carries it.' : '.')
        : 'Partner star: none. Gender was not given, so do NOT use partner-star or romance-star logic.'),
    'Current 10-year luck pillar: ' + (c.luck && c.luck.current ? c.luck.current.hanja + ' (' + c.luck.current.stem.element + ' over ' + c.luck.current.branch.element + '), ages ' + c.luck.current.age + '-' + c.luck.current.ageEnd + '; relationship to Day Master: ' + relation_(el, c.luck.current.stem.element) : 'not available'),
    '',
    'The year 2027 is 丁未, the Red Goat year: Yin Fire over Earth. For this Day Master, Fire = ' + relation_(el, 'Fire') + '; Earth = ' + relation_(el, 'Earth') + '.',
    'The saju year 2027 starts at Ipchun, February 4 2027.',
    '2027 saju months (exact start dates, Korea time; name them exactly like this):',
  ];
  MONTHS_2027.forEach(function (m) { lines.push('- ' + monthTag_(m) + ': ' + m[3] + ' over ' + m[4] + ' -> stem = ' + relation_(el, m[3]).split(' (')[0] + ', branch = ' + relation_(el, m[4]).split(' (')[0]); });
  return lines.join('\n');
}

function writeFor_(product, d) {
  if (product == 'compat') return writeCompat_(d.chart, d.partner);
  if (product == 'bundle') return writeCompat_(d.chart, d.partner) + '\n\n' + writeReading_(d.chart);
  return writeReading_(d.chart || d);
}

var SYSTEM_COMPAT = [
  'You are Haneul, a warm Korean saju (사주) reader writing in natural, modern English for young adults curious about Korean culture.',
  'You receive the Layer 1 gunghap (궁합, compatibility) facts for two people as JSON. They were calculated exactly by code. Never recalculate or invent pillars, relations, scores or dates. Every claim must come from a fact in the JSON.',
  'Person A is the buyer ("you"); Person B is the other person ("them"). The relationship type is given (couple, crush or friend). For a friend reading use no romance language.',
  'Write six sections with these exact headings, each starting with "## ":',
  '## Your two energies / ## What pulls you together / ## Where you rub / ## What you give each other / ## Your 2027 together / ## How to make it work',
  '1 Your two energies: one paragraph per person, from the Day Masters. 2 What pulls you together: harmonies and stem combinations if any, otherwise what each admires in the other. 3 Where you rub: clashes, resentment, punishment, harm, written as different rhythms and how to handle them. 4 What you give each other: element balance. 5 Your 2027 together: easier and harder seasons for the pair in the Fire Goat year. 6 How to make it work: advice for each friction point found, using the advice base given; longest for Challenging matches; for Easy Flow, what to protect.',
  'State the score and level plainly once (for example "7 out of 10, Balanced"). A low score is said honestly, then followed by specific advice. Never show or mention plus or minus points.',
  'Length: 850 to 1,050 words. Short paragraphs. Keep each Korean term with a plain English gloss the first time, for example "육합 (six harmony)". If birth_time_unknown is true, say in one line that the match was read without the hour pillar.',
  'Tone: self-discovery, never fate. Saju describes patterns and timing; it does not say whether to stay together or break up, and it never predicts the outcome.',
  'Hard rules (never break): no fear words (doomed, cursed, danger, bad match); no guarantees ("you will marry", "they will come back"); a clash or 원진 is friction to understand, never a reason to leave; no health, legal or financial advice; no celebrity or K-pop idol names.',
  'End with exactly this line on its own: "For entertainment and self-reflection."'
].join('\n');

function compatBrief_(chart, p) {
  var lines = [];
  lines.push('Relationship type: ' + (p.kind || 'couple'));
  lines.push('Layer 1 facts (JSON):');
  lines.push(JSON.stringify(p.facts));
  if (p.strengths && p.strengths.length) { lines.push('Strengths found:'); p.strengths.forEach(function (n) { lines.push('- ' + n[0] + ': ' + n[1]); }); }
  if (p.advice && p.advice.length) { lines.push('Frictions found, with the advice base to build on:'); p.advice.forEach(function (a) { lines.push('- ' + a.title + ': ' + a.meaning + ' Advice: ' + a.tip); }); }
  else lines.push('Frictions found: none.');
  if (chart && chart.dayMaster) lines.push('Person A is "' + chart.dayMaster.title + '" (' + chart.dayMaster.tag + ').');
  lines.push('');
  lines.push('2027 is 丁未 (Yin Fire over Earth). 2027 months:');
  MONTHS_2027.forEach(function (m) { lines.push('- ' + monthTag_(m) + ': ' + m[3] + ' over ' + m[4] + ' -> for A: ' + relation_(p.a_el, m[3]).split(' (')[0] + '; for B: ' + relation_(p.b_el, m[3]).split(' (')[0]); });
  return lines.join('\n');
}

function writeCompat_(chart, partner) { return callAI_(SYSTEM_COMPAT, 'Here are the calculated charts and compatibility facts. Write the reading.\n\n' + compatBrief_(chart, partner)); }

function writeReading_(chart) { return callAI_(SYSTEM_PROMPT, 'Here is the calculated chart. Write the reading.\n\n' + chartBrief_(chart)); }

function callAI_(system, user) {
  var key = P_('ANTHROPIC_KEY'); if (!key) throw new Error('ANTHROPIC_KEY not set');
  var body = {
    model: P_('MODEL', 'claude-sonnet-5-5'), max_tokens: 2200, system: system,
    messages: [{ role: 'user', content: user }]
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

function emailReading_(to, token, text, chart, product) {
  if (!to) return;
  var brand = P_('BRAND', 'K-Saju'), link = P_('SITE_URL', 'https://cryptojack762.github.io/jacob-nba/ksaju/') + 'reading.html?r=' + token;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var html = text.split(/\n+/).map(function (l) {
    l = l.trim(); if (!l) return '';
    return /^#+\s/.test(l) ? '<h3 style="color:#a8792b;margin:22px 0 6px">' + esc(l.replace(/^#+\s*/, '')) + '</h3>' : '<p style="line-height:1.6;margin:0 0 12px">' + esc(l) + '</p>';
  }).join('');
  var opt = {
    to: to, name: brand, subject: product == 'compat' ? 'Your compatibility reading' : product == 'bundle' ? 'Your compatibility + 2027 readings' : 'Your 2027 reading: ' + chart.dayMaster.title + ' (' + chart.dayMaster.hanja + ')',
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
function testCompatPrompt() { Logger.log(compatBrief_(SAMPLE_(), { kind: 'couple', a_el: 'Fire', b_el: 'Metal', facts: { a: { day_master: '丙 Yang Fire', day_branch: '午', year_branch: '卯' }, b: { day_master: '辛 Yin Metal', day_branch: '未', year_branch: '戌' }, day_master_pair: 'stem_combination 丙辛', spouse_palace: ['six_harmony 午未'], zodiac: ['six_harmony 卯戌'], score: 10, level: 'Easy Flow', pair_type: 'Magnet Pair' }, strengths: [['Stem combination', '丙 and 辛']], advice: [] })); }
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


// ---------- daily email (added 11/19) ----------
var D_BR = '子丑寅卯辰巳午未申酉戌亥', D_ST = '甲乙丙丁戊己庚辛壬癸';
var D_EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
var D_AN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
var D_ORDER = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
var D_GOD = [['Friend day', 'Your own element is strong today. Good for teamwork and standing your ground. Watch for stubbornness.'],
  ['Expression day', 'Your energy flows outward. Good for making, teaching, cooking and speaking up. Rest before you run dry.'],
  ['Wealth day', 'You have the upper hand on what you go after. Good for money tasks, errands and finishing. Don\'t overreach.'],
  ['Pressure day', 'Outside demands are stronger today. Good for discipline and rules. Pick your battles and breathe.'],
  ['Support day', 'Today feeds you. Good for learning, asking for help and recovering. Say yes to support.']];
function dayPillar_(y, m, d) {   // day index = days since 1900-01-01 + 10, mod 60 (1900-01-01 was 甲戌)
  var days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 864e5), i = ((days + 10) % 60 + 60) % 60;
  return { hanja: D_ST[i % 10] + D_BR[i % 12], s: i % 10, b: i % 12 };
}
function dailySignup_(b) {
  var em = clean_(b.email, 120).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, err: 'bad email' };
  if (!b.dm || D_ORDER.indexOf(b.dm.element) < 0) return { ok: false, err: 'missing chart' };
  var time = /^\d\d:\d\d$/.test(b.time) ? b.time : '08:00', tz = clean_(b.tz, 60) || 'America/Chicago';
  var sh = ss_().getSheetByName('Daily'), last = sh.getLastRow();
  if (last > 1) {
    var em_ = sh.getRange(2, 2, last - 1, 1).getValues();
    for (var i = 0; i < em_.length; i++) if (em_[i][0] == em) {
      sh.getRange(i + 2, 3, 1, 6).setValues([[time, tz, b.dm.element, clean_(b.dm.hanja, 4), clean_(b.dm.title, 40), clean_(b.dayBranch, 2)]]);
      sh.getRange(i + 2, 10).setValue('yes'); return { ok: true, updated: true };
    }
  }
  sh.appendRow([new Date(), em, time, tz, b.dm.element, clean_(b.dm.hanja, 4), clean_(b.dm.title, 40), clean_(b.dayBranch, 2), Utilities.getUuid().replace(/-/g, ''), 'yes', '']);
  return { ok: true };
}
function unsub_(t) {
  var sh = ss_().getSheetByName('Daily'), last = sh.getLastRow(); if (last < 2) return;
  var v = sh.getRange(2, 9, last - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (v[i][0] == t) sh.getRange(i + 2, 10).setValue('no');
}
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() == 'sendDailyEmails') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendDailyEmails').timeBased().everyHours(1).create();
}
function sendDailyEmails() {
  var sh = ss_().getSheetByName('Daily'), last = sh.getLastRow(); if (last < 2) return;
  var rows = sh.getRange(2, 1, last - 1, 11).getValues(), now = new Date(), brand = P_('BRAND', 'K-Saju'), site = P_('SITE_URL', 'https://cryptojack762.github.io/jacob-nba/ksaju/');
  var api = ScriptApp.getService().getUrl();
  rows.forEach(function (r, i) {
    if (r[9] != 'yes' || MailApp.getRemainingDailyQuota() < 1) return;
    var tz = r[3] || 'America/Chicago', day = Utilities.formatDate(now, tz, 'yyyy-MM-dd'), hr = +Utilities.formatDate(now, tz, 'H');
    if (r[10] == day || hr != +String(r[2]).split(':')[0]) return;
    var p = day.split('-').map(Number), tp = dayPillar_(p[0], p[1], p[2]);
    var k = (D_ORDER.indexOf(D_EL[tp.s]) - D_ORDER.indexOf(r[4]) + 5) % 5, g = D_GOD[k];
    var html = '<div style="font:16px/1.5 sans-serif;max-width:520px;margin:auto;color:#222">' +
      '<p style="color:#888;margin:0">' + brand + ' · ' + day + '</p><h2 style="margin:4px 0">Today ' + tp.hanja + ' · ' + g[0] + '</h2>' +
      '<p>' + (r[6] ? r[6] + ' (' + r[4] + '): ' : '') + g[1] + '</p>' +
      '<p><a href="' + site + 'hub.html#today">Open Today for your good-day check, streak and journal</a></p>' +
      '<p style="color:#888;font-size:12px">For reflection and entertainment. Not medical, legal or financial advice. In a crisis call or text 988.<br>' +
      (P_('MAIL_FOOTER') ? P_('MAIL_FOOTER') + '<br>' : '') + '<a href="' + api + '?unsub=' + r[8] + '">Unsubscribe</a></p></div>';
    MailApp.sendEmail({ to: r[1], subject: 'Today ' + tp.hanja + ': ' + g[0], htmlBody: html, name: brand, replyTo: P_('REPLY_TO') || undefined });
    sh.getRange(i + 2, 11).setValue(day);
  });
}

// ---------- Ask Haneul (added 11/19). Free answers per phone, daily cap protects the AI bill. ----------
var SYSTEM_CHAT = 'You are Haneul, a warm young Korean saju guide in the K-Saju app. Answer the user\'s question from THEIR calculated chart only (given below). ' +
  'Plain, kind English, 120-220 words. Be specific to their Day Master, element balance and timing. One practical suggestion. ' +
  'Never predict death, illness, disasters or exact events; never give medical, legal, financial or mental-health advice; never use fear to sell. ' +
  'If the user mentions self-harm, abuse or danger, reply only: Please call or text 988 now, or 911 if you are in danger. ' +
  'End with: For reflection and entertainment.';
var SYSTEM_MIND = 'You are Haneul, a warm, grounded guide in the Giun / K-Saju app. The user is sharing a personal trouble. Reply in plain kind English, 170-260 words, in four short parts with bold labels: ' +
  '**Today\'s energy** (use their calculated chart and today\'s day pillar/moon given below as a lens for reflection; NEVER say the stars, moon or chart caused the problem or the other person\'s behavior; say tradition reads the day a certain way), ' +
  '**What psychology says** (one or two evidence-based ideas in plain words: CBT reframing, Gottman flooding breaks and soft start-ups, attachment, self-compassion, gratitude, sleep, activity scheduling), ' +
  '**Questions to ask yourself** (2-3 gentle "Did you...?" questions, no blame), and **One next step** (small and concrete). ' +
  'Be fair to everyone involved; do not take sides or diagnose anyone. No medical, legal or financial advice. If it sounds heavy or long-lasting, suggest a counselor. ' +
  'If the user mentions self-harm, suicide, abuse, violence or danger, reply ONLY: Please call or text 988 now (Suicide & Crisis Lifeline), or 911 if you are in danger. For abuse: 1-800-799-7233. You deserve support. ' +
  'End with: For reflection, not therapy.';
function ask_(b) {
  var q = clean_(b.question, 950), dev = clean_(b.device, 40); if (!q || !dev) return { ok: false, err: 'missing' };
  if (!b.chart || !b.chart.dayMaster) return { ok: false, err: 'missing chart' };
  var sh = ss_().getSheetByName('Chat'), last = sh.getLastRow(), rows = last > 1 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];
  var today = new Date().toDateString(), usedToday = rows.filter(function (r) { return new Date(r[0]).toDateString() == today; }).length;
  if (usedToday >= +P_('CHAT_DAILY_CAP', '1000000')) return { ok: false, err: 'busy' };
  if (rows.filter(function (r) { return r[1] == dev; }).length >= +P_('CHAT_FREE', '999999')) return { ok: false, err: 'limit' };
  var key = P_('ANTHROPIC_KEY'); if (!key) return { ok: false, err: 'not ready' };
  var hist = (b.history || []).slice(-6).map(function (m) { return (m.who == 'h' ? 'Haneul: ' : 'User: ') + clean_(m.t, 800); }).join('\n');
  var r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: P_('MODEL', 'claude-sonnet-5-5'), max_tokens: b.mode == 'mind' ? 900 : 600, system: b.mode == 'mind' ? SYSTEM_MIND : SYSTEM_CHAT,
      messages: [{ role: 'user', content: 'Chart:\n' + chartBrief_(b.chart) + (hist ? '\n\nEarlier chat:\n' + hist : '') + '\n\nQuestion: ' + q }] })
  });
  var j = JSON.parse(r.getContentText()); if (r.getResponseCode() >= 300) throw new Error('AI: ' + (j.error && j.error.message));
  var a = (j.content || []).filter(function (x) { return x.type == 'text'; }).map(function (x) { return x.text; }).join('\n').trim();
  sh.appendRow([new Date(), dev, q, a]);
  return { ok: true, answer: a };
}
