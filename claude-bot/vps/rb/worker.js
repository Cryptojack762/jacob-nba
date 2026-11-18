// Atlas server browser: a real Chrome on the VPS (Xvfb :99) that Claude drives through the bot's "Browser" sheet tab.
// Claude writes a command row (JSON) -> this worker polls the bot web app -> runs it -> posts the result back to the row.
// Jacob can watch / log in through noVNC (https://<host>:6080/vnc.html). Logins persist in /opt/rb/profile.
const { chromium } = require('playwright');
const fs = require('fs');
const CFG = JSON.parse(fs.readFileSync('/opt/rb/config.json', 'utf8'));   // { url: bot web app /exec, key: RB_KEY }
let ctx = null, page = null, lastCmd = 0;
async function browser() {
  if (ctx) return;
  ctx = await chromium.launchPersistentContext('/opt/rb/profile', { headless: false, viewport: { width: 1366, height: 850 }, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  ctx.on('close', () => { ctx = null; page = null; });
  page = ctx.pages()[0] || await ctx.newPage();
}
async function post(body) {
  const r = await fetch(CFG.url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(Object.assign({ key: CFG.key }, body)), redirect: 'follow' });
  return r.json();
}
const clip = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '\n...[cut ' + (s.length - n) + ' chars]' : s; };
async function elements() {
  return page.evaluate(() => {
    const out = []; let i = 0;
    document.querySelectorAll('a,button,input,select,textarea,[role=button],[role=tab],[role=link],[role=menuitem],[onclick]').forEach(e => {
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || i >= 200) return;
      e.setAttribute('data-rb', String(i));
      const t = (e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.title || '').trim().replace(/\s+/g, ' ').slice(0, 70);
      out.push(i + ' ' + e.tagName.toLowerCase() + (e.type ? '[' + e.type + ']' : '') + ' ' + t); i++;
    });
    return out.join('\n');
  });
}
const at = c => c.n != null ? '[data-rb="' + c.n + '"]' : c.sel;
async function run(c) {
  await browser(); const t = c.timeout || 20000;
  switch (c.do) {
    case 'goto': await page.goto(c.url, { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForTimeout(c.wait || 2500); return 'URL ' + page.url() + '\nTITLE ' + await page.title();
    case 'text': return 'URL ' + page.url() + '\n' + clip(await page.evaluate(() => document.body.innerText), c.max || 20000);
    case 'elements': return 'URL ' + page.url() + '\n' + await elements();
    case 'click': if (c.text) await page.getByText(c.text, { exact: !!c.exact }).first().click({ timeout: t }); else await page.click(at(c), { timeout: t }); await page.waitForTimeout(c.wait || 1500); return 'clicked. URL ' + page.url();
    case 'type': await page.fill(at(c), String(c.value)); return 'typed';
    case 'press': await page.keyboard.press(c.key); await page.waitForTimeout(c.wait || 1000); return 'pressed ' + c.key;
    case 'scroll': await page.mouse.wheel(0, c.dy || 800); await page.waitForTimeout(500); return 'scrolled';
    case 'eval': return clip(JSON.stringify(await page.evaluate(c.js)), c.max || 20000);
    case 'shot': { fs.mkdirSync('/opt/rb/shots', { recursive: true }); const f = '/opt/rb/shots/' + (c.name || 'shot') + '.png'; await page.screenshot({ path: f }); return 'saved ' + f; }
    case 'tabs': return ctx.pages().map((p, i) => i + ' ' + p.url()).join('\n');
    case 'tab': page = ctx.pages()[c.i]; await page.bringToFront(); return 'tab ' + c.i + ' ' + page.url();
    case 'newtab': page = await ctx.newPage(); if (c.url) await page.goto(c.url, { waitUntil: 'domcontentloaded' }); return 'new tab ' + page.url();
    case 'restart': try { await ctx.close(); } catch (e) { } ctx = null; return 'restarted';
    case 'ping': return 'pong ' + new Date().toISOString();
    default: throw new Error('unknown do: ' + c.do);
  }
}
async function loop() {
  for (;;) {
    let wait = Date.now() - lastCmd < 180000 ? 2000 : 20000;
    try {
      const j = await post({ rb: 'poll' });
      for (const x of (j.cmds || [])) {
        lastCmd = Date.now(); let ok = true, res;
        try { const c = JSON.parse(x.cmd), steps = Array.isArray(c) ? c : [c], outs = []; for (const s of steps) outs.push(await run(s)); res = outs.join('\n---\n'); }
        catch (e) { ok = false; res = 'ERROR ' + e.message; }
        await post({ rb: 'done', row: x.row, ok, result: res }); wait = 500;
      }
    } catch (e) { console.error('poll', e.message); wait = 30000; }
    await new Promise(r => setTimeout(r, wait));
  }
}
loop();
