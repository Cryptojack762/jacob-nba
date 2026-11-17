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
