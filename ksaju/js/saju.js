// K-Saju chart engine (Layer 1). Pure math, no AI.
// Wraps the open-source `manseryeok` library (KASI data, MIT) and adds:
//  - birth-city time zone -> exact instant (works for births anywhere, not just Korea)
//  - true solar time from birth longitude (optional)
//  - English labels, five-element %, zodiac animal, current 10-year luck pillar
import { calculateFourPillars, getSolarTerm } from 'https://cdn.jsdelivr.net/npm/manseryeok@2.0.0/+esm';

export const CONFIG = {
  trueSolarTime: true,      // decide with Dustin: true = sun time at birthplace, false = local clock time
  dayBoundary: 'midnight',  // 'midnight' | 'jasi' | 'splitJasi'
};

const STEMS = '갑을병정무기경신임계', STEMS_H = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '자축인묘진사오미신유술해', BRANCHES_H = '子丑寅卯辰巳午未申酉戌亥';
const STEM_EL = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
const BRANCH_EL = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
const BRANCH_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const EL_COLOR_NAME = { Wood: 'Blue', Fire: 'Red', Earth: 'Yellow', Metal: 'White', Water: 'Black' };
export const EL_KO = { Wood: '목', Fire: '화', Earth: '토', Metal: '금', Water: '수' };
export const EL_HANJA = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
export const ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

// The ten Day Masters: plain-English identity used on the free result and share card.
export const DAY_MASTERS = [
  { name: 'The Great Tree', tag: 'Steady, principled, always growing upward.' },
  { name: 'The Flower Vine', tag: 'Graceful, adaptable, finds a way around anything.' },
  { name: 'The Sun', tag: 'Warm, generous, impossible to ignore.' },
  { name: 'The Candle', tag: 'Quietly brilliant, lights up the people close to you.' },
  { name: 'The Mountain', tag: 'Solid, protective, the calm in every storm.' },
  { name: 'The Garden', tag: 'Nurturing, practical, makes things grow.' },
  { name: 'The Sword', tag: 'Bold, decisive, built for big moves.' },
  { name: 'The Jewel', tag: 'Refined, precise, shines under pressure.' },
  { name: 'The Ocean', tag: 'Deep, free-spirited, full of ideas.' },
  { name: 'The Rain', tag: 'Intuitive, gentle, quietly powerful.' },
];

function stemIdx(ch) { const i = STEMS.indexOf(ch); if (i < 0) throw new Error('bad stem ' + ch); return i; }
function branchIdx(ch) { const i = BRANCHES.indexOf(ch); if (i < 0) throw new Error('bad branch ' + ch); return i; }

function pillarInfo(ko) {
  const s = stemIdx(ko[0]), b = branchIdx(ko[1]);
  return {
    ko, hanja: STEMS_H[s] + BRANCHES_H[b],
    stem: { ko: ko[0], hanja: STEMS_H[s], element: STEM_EL[s], yang: s % 2 === 0 },
    branch: { ko: ko[1], hanja: BRANCHES_H[b], element: BRANCH_EL[b], yang: !!BRANCH_YANG[b], animal: ANIMALS[b] },
  };
}

// Offset (ms) of an IANA time zone from UTC at a given instant.
function tzOffset(tz, utcMs) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = {}; f.formatToParts(new Date(utcMs)).forEach(x => { p[x.type] = x.value; });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}
// Local wall-clock time in a time zone -> UTC milliseconds (handles DST, incl. historical rules).
export function localToUtc(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let utc = guess - tzOffset(tz, guess);
  utc = guess - tzOffset(tz, utc);
  return utc;
}

/**
 * Build a chart.
 * input: { year, month, day, hour|null, minute, tz:'America/Chicago', longitude:-98.5, gender:'male'|'female'|'' , now?:Date }
 * hour null = birth time unknown (no hour pillar).
 */
export function buildChart(input) {
  const timeKnown = input.hour !== null && input.hour !== undefined && input.hour !== '';
  const h = timeKnown ? +input.hour : 12, mi = timeKnown ? +(input.minute || 0) : 0;
  const utc = localToUtc(+input.year, +input.month, +input.day, h, mi, input.tz || 'Asia/Seoul');
  // Fixed UTC+9 wall clock = what the library expects as "KST" when its historical DST handling is off.
  const k = new Date(utc + 9 * 3600e3);
  const args = {
    year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate(), hour: k.getUTCHours(), minute: k.getUTCMinutes(),
    dayBoundary: CONFIG.dayBoundary,
  };
  const lon = Number(input.longitude);
  if (CONFIG.trueSolarTime && isFinite(lon)) {
    args.trueSolarTime = { longitude: lon, applyEquationOfTime: true, applyHistoricalDst: false };
  } else {
    // Local clock mode: shift day/hour pillars to the birthplace's own clock time (its zone meridian).
    // Use the zone's STANDARD offset that year (daylight saving removed, as Korean saju does).
    const tz = input.tz || 'Asia/Seoul', yr = +input.year;
    const offH = Math.min(tzOffset(tz, Date.UTC(yr, 0, 15)), tzOffset(tz, Date.UTC(yr, 6, 15)), tzOffset(tz, utc)) / 3600e3;
    args.trueSolarTime = { longitude: offH * 15, applyEquationOfTime: false, applyHistoricalDst: false };
  }
  if (input.gender === 'male' || input.gender === 'female') args.gender = input.gender;
  const r = calculateFourPillars(args);
  const o = r.toObject();
  const pillars = { year: pillarInfo(o.year), month: pillarInfo(o.month), day: pillarInfo(o.day), hour: timeKnown ? pillarInfo(o.hour) : null };

  // Five-element balance across the visible characters (8, or 6 without birth time).
  const count = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 }; let n = 0;
  ['year', 'month', 'day', 'hour'].forEach(key => {
    const p = pillars[key]; if (!p) return;
    count[p.stem.element]++; count[p.branch.element]++; n += 2;
  });
  const pct = {}; ELEMENTS.forEach(e => { pct[e] = Math.round(count[e] / n * 100); });
  const fix = 100 - ELEMENTS.reduce((a, e) => a + pct[e], 0);
  if (fix) { const top = ELEMENTS.slice().sort((a, b) => count[b] - count[a])[0]; pct[top] += fix; }
  const strongest = ELEMENTS.slice().sort((a, b) => pct[b] - pct[a])[0];
  const missing = ELEMENTS.filter(e => count[e] === 0);

  const dm = pillars.day.stem, dmIdx = STEMS_H.indexOf(dm.hanja);
  const dayMaster = {
    ko: dm.ko, hanja: dm.hanja, element: dm.element, yang: dm.yang,
    label: (dm.yang ? 'Yang ' : 'Yin ') + dm.element, title: DAY_MASTERS[dmIdx].name, tag: DAY_MASTERS[dmIdx].tag, index: dmIdx,
  };
  const yp = pillars.year;
  const animal = { name: yp.branch.animal, color: EL_COLOR_NAME[yp.stem.element], element: yp.stem.element, hanja: yp.branch.hanja };

  // Current 10-year luck pillar (needs gender).
  let luck = null;
  if (r.luckPillars && r.luckPillars.pillars) {
    const now = input.now || new Date();
    const age = (now.getTime() - utc) / (365.2425 * 864e5);
    const list = r.luckPillars.pillars.map(p => ({ age: p.age, ko: p.korean || p.pillar }));
    let cur = null; list.forEach(p => { if (age >= p.age) cur = p; });
    luck = { forward: r.luckPillars.forward, startAge: r.luckPillars.startAge, current: cur ? Object.assign({ age: cur.age, ageEnd: cur.age + 9 }, pillarInfo(cur.ko)) : null, list };
  }

  return {
    version: 'ksaju-engine-1 (manseryeok 2.0.0)',
    input: { date: `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`, time: timeKnown ? `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` : 'unknown', tz: input.tz, longitude: lon, gender: input.gender || '', solarTime: CONFIG.trueSolarTime },
    pillars, dayMaster, elements: { count, pct, strongest, missing }, animal, luck, tenGods: r.tenGods || null,
    hanja: r.toHanjaString ? r.toHanjaString() : '',
  };
}

// Ipchun (start of spring, the saju new year) for a given year, as an absolute Date.
export function ipchun(year) { return getSolarTerm(year, 2).date; }
