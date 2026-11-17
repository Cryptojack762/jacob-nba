// Compatibility math (deterministic, no AI). Uses only derived chart facts, never birth dates.
import { ELEMENTS } from './saju.js?v=7';

const BR = '자축인묘진사오미신유술해';
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const HARMONY = ['자축', '인해', '묘술', '진유', '사신', '오미'];          // 六合 six harmonies
const CLASH = ['자오', '축미', '인신', '묘유', '진술', '사해'];            // 六沖 six clashes
const TRIO = ['신자진', '해묘미', '인오술', '사유축'];                     // 三合 three harmonies
const pair = (a, b, list) => list.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const trio = (a, b) => a !== b && TRIO.some(t => t.includes(a) && t.includes(b));

// Compact, privacy-safe code for invite links: Day Master stem, day branch, year branch, element counts.
export function encode(c) {
  const e = ELEMENTS.map(x => c.elements.count[x]).join('');
  return [c.dayMaster.ko, c.pillars.day.branch.ko, c.pillars.year.branch.ko, e, c.dayMaster.index].join('.');
}
export function decode(s) {
  try {
    const [dm, db, yb, e, idx] = decodeURIComponent(s).split('.');
    if (!dm || !db || !yb || !/^\d{5}$/.test(e)) return null;
    const count = {}; ELEMENTS.forEach((x, i) => count[x] = +e[i]);
    return { dm, db, yb, count, idx: +idx };
  } catch (x) { return null; }
}
function rel(a, b) { return (ELEMENTS.indexOf(b) - ELEMENTS.indexOf(a) + 5) % 5; } // 0 same, 1 a feeds b, 2 a shapes b, 3 b shapes a, 4 b feeds a

/** A and B as {dmElement, dmTitle, db (korean branch), yb, count} */
export function compare(A, B) {
  let score = 62; const notes = [];
  const r = rel(A.el, B.el);
  if (r === 0) { score += 8; notes.push(['Same element', `You're both ${A.el}. You understand each other instantly, like looking in a mirror.`]); }
  if (r === 1) { score += 12; notes.push(['You lift them up', `Your ${A.el} naturally feeds their ${B.el}. You bring out their best.`]); }
  if (r === 4) { score += 12; notes.push(['They lift you up', `Their ${B.el} naturally feeds your ${A.el}. You feel supported around them.`]); }
  if (r === 2) { score += 6; notes.push(['Spark and challenge', `Your ${A.el} shapes their ${B.el}. There's attraction and a push to grow.`]); }
  if (r === 3) { score += 6; notes.push(['Spark and challenge', `Their ${B.el} shapes your ${A.el}. They challenge you in ways that make you stronger.`]); }
  if (pair(A.db, B.db, HARMONY)) { score += 12; notes.push(['Heart connection', 'Your day branches form a Six Harmony (六合), one of the classic signs of natural closeness.']); }
  else if (trio(A.db, B.db)) { score += 9; notes.push(['Team energy', 'Your day branches belong to the same Three Harmony group (三合): you move well together.']); }
  else if (pair(A.db, B.db, CLASH)) { score += 2; notes.push(['Magnetic opposites', 'Your day branches are opposites (沖). That brings chemistry and lively energy, and it rewards patience.']); }
  else if (A.db === B.db) { score += 6; notes.push(['Same rhythm', 'You share the same day branch, so your daily rhythms feel familiar.']); }
  const ya = BR.indexOf(A.yb), yb = BR.indexOf(B.yb);
  if (pair(A.yb, B.yb, HARMONY) || trio(A.yb, B.yb)) { score += 5; notes.push(['Zodiac match', `${ANIMALS[ya]} and ${ANIMALS[yb]} are a traditionally friendly pairing.`]); }
  const fills = ELEMENTS.filter(e => A.count[e] === 0 && B.count[e] > 0);
  const fills2 = ELEMENTS.filter(e => B.count[e] === 0 && A.count[e] > 0);
  if (fills.length) { score += Math.min(6, fills.length * 3); notes.push(['They complete you', `They bring the ${fills.join(' and ')} your chart is missing.`]); }
  if (fills2.length) { score += Math.min(6, fills2.length * 3); notes.push(['You complete them', `You bring the ${fills2.join(' and ')} their chart is missing.`]); }
  score = Math.max(58, Math.min(97, score));
  return { score, notes, animals: [ANIMALS[ya], ANIMALS[yb]] };
}
