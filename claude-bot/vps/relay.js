// Atlas server: WEEX relay (secret path prefix, kept only on the server in /opt/relay/prefix) + hosts the Atlas and Phoenix apps.
const https = require('https'), http = require('http'), fs = require('fs'), path = require('path');
const PREFIX = '/r/' + fs.readFileSync('/opt/relay/prefix', 'utf8').trim(), HOST = 'api-contract.weex.com';
const SITES = { atlas: '/opt/www/atlas/claude-bot', phoenix: '/opt/www/phoenix/phoenix' };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
let hits = [];
function serveStatic(req, res) {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' ) { res.writeHead(302, { Location: '/atlas/' }); return res.end(); }
  const m = u.match(/^\/(atlas|phoenix)(\/.*)?$/); if (!m) { res.writeHead(404); return res.end('not found'); }
  if (!m[2]) { res.writeHead(301, { Location: '/' + m[1] + '/' }); return res.end(); }
  const root = SITES[m[1]]; let f = path.normalize(path.join(root, m[2].endsWith('/') ? m[2] + 'index.html' : m[2]));
  if (!f.startsWith(root + path.sep) || /\/\.|\.(gs|md|py|pem)$/.test(f)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(f), h = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    h['Cache-Control'] = /\.(html|js|json)$/.test(f) ? 'no-cache' : 'max-age=3600';
    res.writeHead(200, h); res.end(d);
  });
}
https.createServer({ key: fs.readFileSync('/opt/relay/key.pem'), cert: fs.readFileSync('/opt/relay/cert.pem') }, (req, res) => {
  if (req.url === '/health') return res.end('ok');
  if (!req.url.startsWith(PREFIX + '/capi/')) return req.method === 'GET' ? serveStatic(req, res) : (res.writeHead(404), res.end());
  const now = Date.now(); hits = hits.filter(t => now - t < 60000); if (hits.length > 240) { res.writeHead(429); return res.end('slow down'); } hits.push(now);
  const p = req.url.slice(PREFIX.length); let body = [];
  req.on('data', c => body.push(c)); req.on('end', () => { body = Buffer.concat(body);
    const h = {}; ['access-key', 'access-sign', 'access-passphrase', 'access-timestamp', 'content-type'].forEach(k => { if (req.headers[k]) h[k] = req.headers[k]; });
    if (!h['access-sign'] && p.indexOf('/market/') < 0) { res.writeHead(401); return res.end('unsigned'); }
    if (body.length) h['content-length'] = body.length;
    const u = https.request({ host: HOST, path: p, method: req.method, headers: h, timeout: 15000 }, r => { res.writeHead(r.statusCode, { 'content-type': r.headers['content-type'] || 'application/json' }); r.pipe(res); });
    u.on('timeout', () => u.destroy(new Error('timeout'))); u.on('error', e => { if (!res.headersSent) res.writeHead(502); res.end(String(e.message)); }); u.end(body);
  });
}).listen(443);
// plain http -> https (also keeps port 80 free for certbot renewals via --standalone? no: renewals use the webroot below)
http.createServer((req, res) => {
  if (req.url.startsWith('/.well-known/acme-challenge/')) { const f = path.join('/var/www/acme', req.url); return fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.end(d); }); }
  res.writeHead(301, { Location: 'https://' + (req.headers.host || '').split(':')[0] + req.url }); res.end();
}).listen(80);
