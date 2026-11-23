// Shared birth-city search (Open-Meteo geocoding: free, no key).
// Open-Meteo only matches the place NAME, so "San Antonio, TX" or "San Antonio Texas" used to return nothing.
// This searches the name part, retries with fewer words, then ranks results using the state/country the user typed.
const STATES = { al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas', ca: 'california', co: 'colorado', ct: 'connecticut', de: 'delaware', fl: 'florida', ga: 'georgia', hi: 'hawaii', id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa', ks: 'kansas', ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland', ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi', mo: 'missouri', mt: 'montana', ne: 'nebraska', nv: 'nevada', nh: 'new hampshire', nj: 'new jersey', nm: 'new mexico', ny: 'new york', nc: 'north carolina', nd: 'north dakota', oh: 'ohio', ok: 'oklahoma', or: 'oregon', pa: 'pennsylvania', ri: 'rhode island', sc: 'south carolina', sd: 'south dakota', tn: 'tennessee', tx: 'texas', ut: 'utah', vt: 'vermont', va: 'virginia', wa: 'washington', wv: 'west virginia', wi: 'wisconsin', wy: 'wyoming', dc: 'district of columbia' };
const COUNTRY = { usa: 'us', us: 'us', 'united states': 'us', america: 'us', uk: 'gb', england: 'gb', korea: 'kr', 'south korea': 'kr', mexico: 'mx', canada: 'ca', japan: 'jp', china: 'cn' };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function look(name) {
  const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=' + encodeURIComponent(name));
  if (!r.ok) throw new Error('geo ' + r.status);
  const j = await r.json();
  return (j.results || []).filter(x => x.timezone);
}

// Returns up to 6 places [{name, admin1, country, country_code, timezone, longitude, latitude, ...}]. Throws only if the service is down.
export async function findCities(raw) {
  const text = String(raw || '').trim();
  if (text.length < 2) return [];
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  let words = (parts[0] || text).split(/\s+/);
  let extra = parts.slice(1).join(' ');
  let list = await look(words.join(' '));
  // "San Antonio Texas" / "Seoul Korea": drop trailing words until the name matches, and use them as the hint
  while (!list.length && words.length > 1) {
    extra = (words.pop() + ' ' + extra).trim();
    list = await look(words.join(' '));
  }
  const hint = norm(extra).split(' ').filter(Boolean);
  if (hint.length) {
    const wantState = hint.map(h => STATES[h] || h);
    const wantCC = hint.map(h => COUNTRY[h]).filter(Boolean);
    const hintText = wantState.join(' ');
    const score = x => {
      const a = norm(x.admin1), c = norm(x.country), cc = String(x.country_code || '').toLowerCase();
      let s = 0;
      if (a && (hintText.includes(a) || wantState.includes(a))) s += 3;
      if (c && hintText.includes(c)) s += 2;
      if (wantCC.includes(cc)) s += 2;
      if (STATES[hint[0]] && cc === 'us') s += 1;
      return s;
    };
    list = list.map((x, i) => ({ x, s: score(x), i })).sort((p, q) => q.s - p.s || p.i - q.i).map(p => p.x);
  }
  return list.slice(0, 6);
}
