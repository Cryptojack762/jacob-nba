// Gunghap (궁합) Layer 1: fixed traditional checks, no AI. Follows 2026-11-17_gunghap-spec-v2.
// Uses only derived chart facts (day stem, day branch, year branch, element counts), never birth dates.
import { ELEMENTS } from './saju.js?v=8';

const ST = '갑을병정무기경신임계', ST_H = '甲乙丙丁戊己庚辛壬癸';
const BR = '자축인묘진사오미신유술해', BR_H = '子丑寅卯辰巳午未申酉戌亥';
const ST_EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

const STEM_COMBO = ['갑기', '을경', '병신', '정임', '무계'];                 // 천간합
const SIX_HARMONY = ['자축', '인해', '묘술', '진유', '사신', '오미'];        // 육합
const THREE_HARMONY = ['신자진', '인오술', '사유축', '해묘미'];              // 삼합 (any 2 of 3 = half)
const CLASH = ['자오', '축미', '인신', '묘유', '진술', '사해'];              // 충
const RESENT = ['자미', '축오', '인유', '묘신', '진해', '사술'];             // 원진
const PUNISH = ['인사', '사신', '인신', '축술', '술미', '축미', '자묘', '진진', '오오', '유유', '해해']; // 형 (incl. self)
const HARM = ['자미', '축오', '인사', '묘진', '신해', '유술'];               // 해

const has = (a, b, list) => list.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const trio = (a, b) => a !== b && THREE_HARMONY.some(t => t.includes(a) && t.includes(b));
const h = (a, b) => BR_H[BR.indexOf(a)] + BR_H[BR.indexOf(b)];
const rel = (a, b) => (ELEMENTS.indexOf(b) - ELEMENTS.indexOf(a) + 5) % 5; // 0 same, 1 a feeds b, 2 a controls b, 3 b controls a, 4 b feeds a

// Privacy-safe code for invite links.
export function encode(c) {
  const e = ELEMENTS.map(x => c.elements.count[x]).join('');
  return [c.dayMaster.ko, c.pillars.day.branch.ko, c.pillars.year.branch.ko, e, c.dayMaster.index, c.pillars.hour ? 1 : 0].join('.');
}
export function decode(s) {
  try {
    const [dm, db, yb, e, idx, t] = decodeURIComponent(s).split('.');
    if (ST.indexOf(dm) < 0 || BR.indexOf(db) < 0 || BR.indexOf(yb) < 0 || !/^\d{5}$/.test(e)) return null;
    const count = {}; ELEMENTS.forEach((x, i) => count[x] = +e[i]);
    return { dm, db, yb, count, idx: +idx, timeKnown: t !== '0' };
  } catch (x) { return null; }
}
export function side(code) {
  const i = ST.indexOf(code.dm);
  return { dm: code.dm, el: ST_EL[i], yang: i % 2 === 0, hanja: ST_H[i], db: code.db, yb: code.yb, count: code.count, idx: i, timeKnown: code.timeKnown !== false };
}

function branchRelations(a, b) {
  const out = [];
  if (has(a, b, SIX_HARMONY)) out.push('six_harmony');
  if (trio(a, b)) out.push('three_harmony');
  if (has(a, b, CLASH)) out.push('clash');
  if (has(a, b, RESENT)) out.push('resentment');
  if (has(a, b, PUNISH)) out.push('punishment');
  if (has(a, b, HARM)) out.push('harm');
  return out;
}

const MONTHS_2027 = [['Feb', 'Water'], ['Mar', 'Water'], ['Apr', 'Wood'], ['May', 'Wood'], ['Jun', 'Fire'], ['Jul', 'Fire'], ['Aug', 'Earth'], ['Sep', 'Earth'], ['Oct', 'Metal'], ['Nov', 'Metal'], ['Dec', 'Water'], ['Jan 2028', 'Water']];

const ADVICE = {
  clash: ['Clash (충)', 'Opposite rhythms: one pushes, the other pulls back.', 'Agree on who leads what. After an argument, give space first and talk later. Don\'t try to make the other person your speed.'],
  resentment: ['Resentment (원진)', 'Small irritations can quietly build up.', 'Say small things when they\'re small. Try a short weekly check-in. Don\'t keep score.'],
  punishment: ['Punishment (형)', 'Friction over control and fairness.', 'Make clear agreements on money, chores and time, and write them down.'],
  harm: ['Harm (해)', 'It\'s easy to misread each other.', 'Say what you need directly, and repeat back what you heard before reacting.'],
  control: ['Day Master control (상극)', 'One of you tends to correct or steer the other.', 'The steering partner asks instead of instructs, and the other gets areas that are fully theirs.'],
  both_lack: ['Shared blind spot', 'You both lack the same element.', 'Bring that element in together (the Korean 개운 tradition), and plan big decisions with someone outside the pair.'],
  hard_months: ['Hard 2027 months', 'Seasons when you both feel pressure.', 'Avoid big shared decisions in those months and schedule them in your easier season.'],
};
const ONE_LINE = {
  'Magnet Pair': 'A natural pull: your charts lock together.',
  'Team Pair': 'You move in the same direction.',
  'Spark Pair': 'Opposite rhythms, strong spark.',
  'Puzzle Pair': 'Each of you holds a piece the other is missing.',
  'Mirror Pair': 'You see yourselves in each other.',
  'Fuel Pair': 'One of you lights the other up.',
  'Growth Pair': 'You push each other to grow.',
};

/** A, B from side(). Returns the Layer 1 facts, score (1-10), level, pair type and advice. */
export function compare(A, B) {
  let score = 5; const strengths = [], frictions = [];
  // 1) Day Master pairing
  let dmPair; const r = rel(A.el, B.el);
  const combo = has(A.dm, B.dm, STEM_COMBO);
  if (combo) { dmPair = 'stem_combination ' + A.hanja + B.hanja; score += 2; strengths.push(['Stem combination (천간합)', `${A.hanja} and ${B.hanja} are one of the five classic Day Master pairings.`]); }
  else if (r === 0) { dmPair = 'same_element'; strengths.push(['Same element', `You're both ${A.el}, so you understand each other quickly.`]); }
  else if (r === 1 || r === 4) { dmPair = r === 1 ? 'a_feeds_b' : 'b_feeds_a'; score += 1; strengths.push(['Feeding cycle (상생)', r === 1 ? `Your ${A.el} feeds their ${B.el}.` : `Their ${B.el} feeds your ${A.el}.`]); }
  else { dmPair = r === 2 ? 'a_controls_b' : 'b_controls_a'; score -= 1; frictions.push('control'); }
  // 2) Spouse palace (day branch)  3) Zodiac (year branch)
  const spouse = branchRelations(A.db, B.db), zodiac = branchRelations(A.yb, B.yb);
  if (spouse.includes('six_harmony')) { score += 2; strengths.push(['Six harmony (육합) on the spouse palace', `Your day branches ${h(A.db, B.db)} are a natural-attraction pair.`]); }
  if (zodiac.includes('six_harmony')) { score += 1; strengths.push(['Six harmony (육합) in your zodiac years', `${ANIMALS[BR.indexOf(A.yb)]} and ${ANIMALS[BR.indexOf(B.yb)]} are a traditionally close pair.`]); }
  if (spouse.includes('three_harmony')) { score += 1; strengths.push(['Three harmony (삼합) on the spouse palace', 'Your day branches belong to the same team of three: same direction, good teamwork.']); }
  if (zodiac.includes('three_harmony')) { score += 1; strengths.push(['Three harmony (삼합) in your zodiac years', 'Your zodiac animals belong to the same team of three.']); }
  ['clash', 'resentment'].forEach(k => { if (spouse.includes(k)) { score -= 2; frictions.push(k); } if (zodiac.includes(k)) { score -= 1; frictions.push(k); } });
  ['punishment', 'harm'].forEach(k => { if (spouse.includes(k)) { score -= 1; frictions.push(k); } if (zodiac.includes(k)) { score -= 1; frictions.push(k); } });
  // 4) Element balance
  const aGives = ELEMENTS.filter(e => B.count[e] === 0 && A.count[e] > 0), bGives = ELEMENTS.filter(e => A.count[e] === 0 && B.count[e] > 0);
  const bothLack = ELEMENTS.filter(e => A.count[e] === 0 && B.count[e] === 0);
  if (aGives.length) { score += 1; strengths.push(['You complete them', `You bring the ${aGives.join(' and ')} their chart lacks.`]); }
  if (bGives.length) { score += 1; strengths.push(['They complete you', `They bring the ${bGives.join(' and ')} your chart lacks.`]); }
  if (bothLack.length) { score -= 1; frictions.push('both_lack'); }
  // 5) 2027 timing (year 丁未): month stem vs each Day Master
  const easy = [], hard = [];
  MONTHS_2027.forEach(m => { const ra = rel(A.el, m[1]), rb = rel(B.el, m[1]); const ok = x => x === 0 || x === 4, press = x => x === 3; if (ok(ra) && ok(rb)) easy.push(m[0]); if (press(ra) && press(rb)) hard.push(m[0]); });
  if (hard.length) frictions.push('hard_months');
  score = Math.max(1, Math.min(10, score));
  const level = score >= 8 ? 'Easy Flow' : score >= 5 ? 'Balanced' : 'Challenging';
  // Pair type: first match wins
  const anyR = k => spouse.includes(k) || zodiac.includes(k);
  const pairType = (combo || spouse.includes('six_harmony')) ? 'Magnet Pair' : anyR('three_harmony') ? 'Team Pair' : anyR('clash') ? 'Spark Pair'
    : (aGives.length && bGives.length) ? 'Puzzle Pair' : r === 0 ? 'Mirror Pair' : (r === 1 || r === 4) ? 'Fuel Pair' : 'Growth Pair';
  const uniq = [...new Set(frictions)];
  const advice = uniq.map(k => { const a = ADVICE[k].slice(); if (k === 'both_lack') a[1] = `You both lack ${bothLack.join(' and ')}.`; if (k === 'hard_months') a[1] = `Months when you both feel pressure: ${hard.join(', ')}.`; return { key: k, title: a[0], meaning: a[1], tip: a[2] }; });
  const facts = {
    a: { day_master: A.hanja + ' ' + (A.yang ? 'Yang ' : 'Yin ') + A.el, day_branch: BR_H[BR.indexOf(A.db)], year_branch: BR_H[BR.indexOf(A.yb)], elements: A.count },
    b: { day_master: B.hanja + ' ' + (B.yang ? 'Yang ' : 'Yin ') + B.el, day_branch: BR_H[BR.indexOf(B.db)], year_branch: BR_H[BR.indexOf(B.yb)], elements: B.count },
    day_master_pair: dmPair,
    spouse_palace: spouse.map(k => k + ' ' + h(A.db, B.db)), zodiac: zodiac.map(k => k + ' ' + h(A.yb, B.yb)),
    element_balance: { a_gives_b: aGives, b_gives_a: bGives, both_lack: bothLack },
    timing_2027: { easier_together: easy, harder_together: hard },
    birth_time_unknown: !(A.timeKnown && B.timeKnown),
    score, level, pair_type: pairType,
  };
  return { score, level, pairType, headline: `${A.el} meets ${B.el}`, line: ONE_LINE[pairType], strengths, advice, facts, animals: [ANIMALS[BR.indexOf(A.yb)], ANIMALS[BR.indexOf(B.yb)]] };
}
