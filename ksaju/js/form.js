// Reusable birth form: city search (Open-Meteo, free) + validation. Returns buildChart() input.
import { findCities } from './geo.js?v=1';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function birthForm(root, prefix) {
  const id = k => prefix + k;
  root.innerHTML = `
    <label for="${id('bd')}">Birth date</label><input id="${id('bd')}" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}">
    <label for="${id('bt')}">Birth time</label><input id="${id('bt')}" type="time">
    <label class="chk"><input id="${id('nt')}" type="checkbox"> I don't know the birth time</label>
    <label for="${id('city')}">Birth city</label>
    <div class="city"><input id="${id('city')}" placeholder="Start typing, e.g. Seoul, Los Angeles" autocomplete="off"><div class="sug" id="${id('sug')}"></div></div>
    <label>Gender <span style="font-weight:400;color:var(--dim)">(optional)</span></label>
    <div class="seg" id="${id('g')}"><button type="button" data-g="female">Female</button><button type="button" data-g="male">Male</button><button type="button" data-g="" class="on">Skip</button></div>`;
  const $ = k => document.getElementById(id(k));
  let CITY = null, list = [], tmr = null, G = '';
  root.querySelectorAll('.seg button').forEach(b => b.onclick = () => { root.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); G = b.dataset.g; });
  $('nt').onchange = () => { $('bt').disabled = $('nt').checked; if ($('nt').checked) $('bt').value = ''; };
  const pick = i => { const x = list[i]; if (!x) return; CITY = x; $('city').value = [x.name, x.admin1, x.country].filter(Boolean).join(', '); $('sug').style.display = 'none'; };
  $('city').addEventListener('input', () => {
    CITY = null; clearTimeout(tmr); const q = $('city').value.trim();
    if (q.length < 2) { $('sug').style.display = 'none'; return; }
    tmr = setTimeout(async () => {
      try {
        const j = { results: await findCities(q) };
        list = j.results;
        $('sug').innerHTML = list.map((x, i) => `<div data-i="${i}">${esc(x.name)} <small>${esc([x.admin1, x.country].filter(Boolean).join(', '))}</small></div>`).join('') || '<div>No match, try a bigger nearby city</div>';
        $('sug').style.display = 'block';
      } catch (e) { $('sug').innerHTML = '<div>Search unavailable</div>'; $('sug').style.display = 'block'; }
    }, 250);
  });
  $('sug').addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (d) { e.preventDefault(); pick(+d.dataset.i); } });
  $('city').addEventListener('blur', () => setTimeout(() => { $('sug').style.display = 'none'; }, 150));
  return {
    read() {
      const bd = $('bd').value; if (!bd) throw new Error('Add the birth date.');
      if (!CITY) { if (list.length) pick(0); else throw new Error('Pick the birth city from the list.'); }
      const [y, m, d] = bd.split('-').map(Number); if (y < 1900) throw new Error('Please use a birth year from 1900 on.');
      let hour = null, minute = 0;
      if (!$('nt').checked) { if (!$('bt').value) throw new Error('Add the birth time, or tick "I don\'t know".'); [hour, minute] = $('bt').value.split(':').map(Number); }
      return { year: y, month: m, day: d, hour, minute, tz: CITY.timezone, longitude: CITY.longitude, gender: G, city: $('city').value };
    }
  };
}
