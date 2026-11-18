// Free-result copy. Warm, self-discovery tone. Entertainment only: no fear, no guarantees.
// Dustin: please check these for Korean authenticity before launch.

export const DM_READS = [
  // 甲 Yang Wood
  "You're the Great Tree: you grow straight toward what you believe in, and people lean on you without even noticing. You like plans with a purpose and friends who are loyal for real. Your challenge is bending a little when the wind changes, because the tallest trees last by learning to sway.",
  // 乙 Yin Wood
  "You're the Flower Vine: soft on the outside, unstoppable underneath. You read a room fast, find the gap nobody else saw, and climb through it with style. You thrive with people who give you room to grow, and you quietly make everything around you more beautiful.",
  // 丙 Yang Fire
  "You're the Sun: warm, open, and impossible to ignore. You lift the mood just by showing up, and you give energy freely. You shine brightest when you have an audience and a cause. Your lesson is resting before you burn out, because even the sun sets.",
  // 丁 Yin Fire
  "You're the Candle: a focused, steady light that shows people the way in the dark. You notice the details others miss and you care deeply about a few people. You're more powerful than you look, and your warmth is felt most up close.",
  // 戊 Yang Earth
  "You're the Mountain: calm, reliable, and hard to move once you've decided. People come to you for safety and honest advice. You build slowly and build to last. Your lesson is letting people climb up and see the view with you.",
  // 己 Yin Earth
  "You're the Garden: practical, nurturing, and quietly productive. You turn ideas into something real and help the people around you grow. You care about comfort, good food and trust. When you believe in yourself as much as you believe in others, you flourish.",
  // 庚 Yang Metal
  "You're the Sword: direct, brave, and built for decisive moves. You cut through confusion and say what everyone else is thinking. You respect strength and fairness. Your gift grows when you add a little softness, so your edge protects instead of cuts.",
  // 辛 Yin Metal
  "You're the Jewel: refined, sensitive, and quietly sparkling. You have high standards and a sharp eye for beauty and quality. Pressure is what polishes you. You shine most around people who see your value without you having to prove it.",
  // 壬 Yang Water
  "You're the Ocean: big-hearted, curious, and always moving. You think in waves of ideas and you hate feeling boxed in. People find you magnetic and a little mysterious. Your lesson is choosing a direction, because a river with banks goes the farthest.",
  // 癸 Yin Water
  "You're the Rain: intuitive, gentle, and deeper than people realize. You sense moods before anyone speaks and you nourish everything you touch. You recharge in quiet. Trust your intuition, because it's one of your strongest tools.",
];

export const EL_MEANING = {
  Wood: 'growth, ideas, kindness',
  Fire: 'passion, visibility, joy',
  Earth: 'stability, trust, care',
  Metal: 'focus, standards, courage',
  Water: 'wisdom, intuition, flow',
};

// Shown blurred behind the paywall: a real sample of what the paid reading feels like.
export function teaser(chart) {
  const dm = chart.dayMaster, s = chart.elements.strongest;
  return [
    `Your 2027 at a glance`,
    `2027 is the year of the Red Goat (丁未), a Fire and Earth year. For a ${dm.label} Day Master like you, this energy shows up first in how people see you at work and in love...`,
    `Love & relationships`,
    `With ${s} as your strongest element, you attract partners who... The months to watch for a meaningful connection are...`,
    `Career & money`,
    `Your luck cycle points to a turning point around... The best season for a bold move is...`,
    `Month by month`,
    `February (Ipchun): ...  March: ...  April: ...`,
  ];
}

// Site v2 (Dustin's proposal, Nov 17): Korean name, romanization, say-it, card one-liner, Haneul's note. Same order as DAY_MASTERS.
export const TYPES = [
  { ko: '갑목', rr: 'gap-mok', say: 'GAHP-mohk', line: 'You grow toward the light, and you bring people with you.', note: "Trees don't rush. You're allowed to grow at your own pace." },
  { ko: '을목', rr: 'eul-mok', say: 'OOL-mohk', line: 'Soft? Sure. But you always find a way through.', note: 'Gentle is not the same as weak. You bend, and you win.' },
  { ko: '병화', rr: 'byeong-hwa', say: 'BYUNG-hwah', line: "You don't enter a room. You warm it.", note: "Suns don't compete with other stars. You were born to warm the room." },
  { ko: '정화', rr: 'jeong-hwa', say: 'JUNG-hwah', line: 'Quiet glow, deep heat. Your people would follow you anywhere.', note: 'A small flame can light a whole house. Never doubt yours.' },
  { ko: '무토', rr: 'mu-to', say: 'MOO-toh', line: "Everyone's calm place. Who's yours?", note: 'Mountains hold everyone up. Let someone hold you too.' },
  { ko: '기토', rr: 'gi-to', say: 'GHEE-toh', line: 'You make things grow, including other people.', note: 'Everything you tend blooms. Save a little sunlight for yourself.' },
  { ko: '경금', rr: 'gyeong-geum', say: 'GYUNG-gum', line: 'Decisive, brave, made for big moves.', note: 'A sword is shaped by fire. Your hard seasons are making you.' },
  { ko: '신금', rr: 'sin-geum', say: 'SHEEN-gum', line: "Pressure doesn't break you. It polishes you.", note: 'You shine brightest when you stop hiding your edges.' },
  { ko: '임수', rr: 'im-su', say: 'EEM-soo', line: 'Endless ideas, endless depth, hard to pin down.', note: 'Oceans are strongest with a direction. Pick your current.' },
  { ko: '계수', rr: 'gye-su', say: 'GYEH-soo', line: 'Gentle, intuitive, and quietly changing everything.', note: "Rain doesn't need to be loud to change a landscape." },
];

// What each pillar means when tapped on the result.
export const PILLAR_INFO = {
  year: ['年', 'Your roots', "The year pillar is about where you come from: your family, your ancestors and the world you were born into. It's also the first impression people get of you, like the cover of a book."],
  month: ['月', 'Your environment', "The month pillar is the season you were born in, so it's about the people and places that shaped you: parents, siblings, home and, later, your work life. Koreans link it to your 20s and 30s."],
  day: ['日', 'You', 'This is the most important pillar. The top character is your Day Master, your core personality. The bottom character is called your "spouse palace": it hints at what you need from the person closest to you.'],
  hour: ['時', 'Your inner world and future', 'The hour pillar is your private side: your dreams, your creativity, and what you build later in life, including children if you have them.'],
};
