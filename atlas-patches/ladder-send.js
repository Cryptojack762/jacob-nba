// Atlas patch (Nov 28, 2026): "Send ladder to WEEX" button on every Bottoms ladder card.
// Calls the bot web app: set=ladder (Apps Script ladderApi_ places one WEEX LIMIT order per rung,
// isolated margin, no stop). Jacob's tap + the confirm box are the approval.
(function () {
  var BTN = 'width:100%;margin-top:10px;padding:12px;border:0;border-radius:10px;background:#1f7a4d;color:#fff;font-weight:600;font-size:15px';
  function addButtons() {
    document.querySelectorAll('[data-ldcard]').forEach(function (card) {
      if (card.querySelector('[data-ldsend]')) return;
      [['WEEX', 'Send ladder to WEEX (one leverage)', '#1f7a4d'], ['BLOFIN', 'Send ladder to BloFin (leverage per rung)', '#8a5a00']].forEach(function (x) {
        var b = document.createElement('button');
        b.setAttribute('data-ldsend', card.getAttribute('data-ldcard'));
        b.setAttribute('data-ex', x[0]);
        b.textContent = x[1];
        b.style.cssText = BTN.replace('#1f7a4d', x[2]);
        card.appendChild(b);
      });
    });
  }
  // Builds the request from the card exactly as the card shows it. WEEX has one leverage per coin,
  // so every rung keeps its typed SIZE ($ margin x leverage) and its margin is restated at the card's leverage.
  window.ldSendPlan = function (i) {
    var L = ldGet()[i]; if (!L) return { err: 'Ladder not found' };
    var c = L.c, q = PCT[c], px = q ? q.last : 0, R = ldCalc(L, px);
    var rows = R.rows.filter(function (r) { return r.pr > 0 && r.m > 0 && r.q > 0; });
    if (!rows.length) return { err: 'No rungs with a price and a $ amount' };
    var lev = Math.round(+L.l || rows[0].l || 20);
    var mixed = rows.some(function (r) { return Math.round(r.l) != lev; });
    var rungs = rows.map(function (r) { return { price: +(+r.pr).toPrecision(8), margin: Math.round(r.m * r.l / lev * 100) / 100 }; });
    var total = rungs.reduce(function (s, r) { return s + r.margin; }, 0);
    var lines = rows.map(function (r, k) { return 'Rung ' + (k + 1) + ': buy $' + fx(r.pr) + ' · $' + (+r.m.toFixed(2)) + ' at ' + r.l + 'x'; }).join('\n');
    // BloFin keeps each rung as its own position: send the typed margin and leverage per rung, unchanged.
    var rungsOwn = rows.map(function (r) { return { price: +(+r.pr).toPrecision(8), margin: Math.round(r.m * 100) / 100, lev: Math.round(r.l) }; });
    var totalOwn = rungsOwn.reduce(function (s, r) { return s + r.margin; }, 0);
    return { c: c, lev: lev, mixed: mixed, rungs: rungs, total: total, rungsOwn: rungsOwn, totalOwn: totalOwn, lines: lines, px: px };
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ldsend]'); if (!b) return;
    if (!window.WAPI || !window.WPIN) { toast('Connect the bot first'); return; }
    var P = ldSendPlan(+b.getAttribute('data-ldsend')), ex = b.getAttribute('data-ex') || 'WEEX', bf = ex == 'BLOFIN';
    if (P.err) { toast(P.err); return; }
    var msg = bf
      ? 'SEND LADDER to BloFin: ' + P.c + ' LONG, isolated, each rung its OWN position and leverage\n' + P.lines + '\nTotal margin $' + P.totalOwn.toFixed(2) +
        '\nLimit orders, NO stop loss (liquidation is the stop).\n\nSend now?'
      : 'SEND LADDER to WEEX: ' + P.c + ' LONG, ' + P.lev + 'x isolated\n' + P.lines +
        '\nTotal margin about $' + P.total.toFixed(2) +
        '\nLimit orders, NO stop loss (liquidation is the stop).' +
        (P.mixed ? '\nWEEX uses one leverage per coin (' + P.lev + 'x): each rung keeps its size, margin is restated.' : '') +
        '\n\nSend now?';
    if (!confirm(msg)) return;
    b.disabled = true; b.textContent = 'Sending ladder to ' + (bf ? 'BloFin' : 'WEEX') + '…';
    var url = WAPI + (WAPI.indexOf('?') > -1 ? '&' : '?') + 'json=1&pin=' + encodeURIComponent(WPIN) + '&set=ladder&ex=' + ex + '&coin=' +
      encodeURIComponent(P.c) + '&side=LONG&lev=' + P.lev + '&rungs=' + encodeURIComponent(JSON.stringify(bf ? P.rungsOwn : P.rungs));
    fetch(url, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (k) {
      b.disabled = false;
      b.textContent = k.ok ? '✔ ' + (k.msg || 'Sent') : '✘ ' + (k.err || k.msg || 'Failed');
      toast(k.ok ? 'Ladder sent' : 'Ladder not sent');
    }).catch(function () { b.disabled = false; b.textContent = '✘ Bot not reachable'; });
  });
  addButtons(); setInterval(addButtons, 1500);
})();
