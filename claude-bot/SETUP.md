# Claude's Trading Bot — what Jacob needs to press

Done by Claude (Nov 17):
- Sheet "Claude's Trading Bot" created.
- Bot code pasted and saved in its Apps Script project (no errors).
- Phone app, playbook and WEEX notes on GitHub branch `claude-bot`.

Jacob's steps, in order:
1. Apps Script → pick `setupBot` → Run → approve Google's permission screen. (Creates the tabs, the hourly scan and your app PIN. Bot starts in PAPER mode — no money.)
2. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone → Deploy. Paste the URL in the Home tab, "Web app URL".
3. Open the phone app, paste that URL and the PIN (Log tab, SETUP line). Add to home screen.
4. Optional: install the free "ntfy" app, subscribe to a private topic name, put it on the Home tab for phone pushes. Otherwise alerts come by email.
5. Let it paper-trade 2–4 weeks.
6. Going live (later): WEEX account + KYC + funding; API key with Read + Trade only (NO withdraw); put WEEX_KEY / WEEX_SECRET / WEEX_PASSPHRASE in Project Settings → Script Properties; switch Mode to APPROVE (you tap every trade). AUTO only when you decide.

## VPS relay (11/18/2026)
- DigitalOcean droplet `ubuntu-s-1vcpu-1gb-sfo2` (id 620570168), $6/mo, SFO2, Ubuntu 24.04. Public IPv4 **157.230.148.63**.
- Login: SSH key "atlas-bot" (no password). Web console in the DigitalOcean dashboard also works.
- Startup script installs `/opt/relay/relay.js` (Node, systemd `atlas-relay`), HTTPS on 443 with a self-signed cert.
  Only forwards already-signed requests to api-contract.weex.com under a secret path prefix; /health returns ok. WEEX keys stay in Apps Script.
- Bot setting **Relay URL** (Home tab) = `https://157-230-148-63.sslip.io/r/<prefix>` (Let's Encrypt cert, auto-renews; restarts relay on renew) (prefix in Claude's scratchpad vps/prefix.txt, also on the droplet in /opt/relay/relay.js).
- WEEX: make a new API key with Read + Trade (NO withdraw), IP allowlist 157.230.148.63.
- 11/18 1:20 AM: the server also hosts the apps (permanent links, auto-update from GitHub every 5 min):
  Atlas  https://157-230-148-63.sslip.io/atlas/   (branch claude-bot, folder claude-bot/)
  Phoenix https://157-230-148-63.sslip.io/phoenix/ (branch main, folder phoenix/)
  Relay code: claude-bot/vps/relay.js (secret prefix lives only in /opt/relay/prefix on the server). Setup: claude-bot/vps/setup_web.sh.

## State 11/18/2026 10 AM CT
- Droplet resized to 2 GB / $12 a month (5:30 AM).
- Bot web app deployment = Version 26. Scan runs every 15 min (setTrigger15). Mode APPROVE, live on WEEX with ~$49.
- Settings live: bot slice $16 ($2 a trade, max 3, BOT coins, 10x), missed-trade fallback $1 (max 6, $15 cap), event pause 60 min, daily loss kill 5%, drawdown kill 20%.
- New in v25-26: health check hourly (Atlas + relay, push after 2 misses), Reports tab (US releases, forecast vs actual, BTC +1h/4h/24h), app status returns dayStart/peak for the loss bar, candles fall back to BloFin for coins not on WEEX.
- Phone pushes: ntfy topic atlas-jacob-c2112e987573 (Home tab). Install ntfy and subscribe.

## Server browser (PC can stay off) - installed 11/18 5:52 AM
- vps/rb/setup_rb.sh installs Xvfb + fluxbox + x11vnc + noVNC (port 6080, Let's Encrypt cert) + Playwright Chromium + rb-worker (systemd).
- Mailbox = bot sheet "Browser" tab: write a row [ID, command JSON, NEW]; the worker polls the bot web app (doPost rb=poll / rb=done, RB_KEY in Script Properties), runs it, writes DONE + result.
- Commands: goto, text, elements, click (n/sel/text), type, press, scroll, eval, shot, tabs, tab, newtab, restart, ping. A JSON list runs in order.
- Tested: ping, WEEX page read, Kalshi API, ESPN API. Torvik blocks the server (CloudFront 403) - use Chrome for Torvik.
- Jacob logs in once at https://157-230-148-63.sslip.io:6080/vnc.html (VNC password in Claude's notes) to WEEX and BloFin; the profile remembers him.

## Rule for every app (Jacob 11/18)
- Host it on the VPS with a manifest + service worker so it installs as a real app with no Chrome badge. Bump the sw.js cache name on every change.

## Auto entry (11/19/2026, bot Version 42, Atlas v33)
- Atlas Home > Auto entry: ticker + $ + Scalp 15m / Day 1H / Swing 4H > Lock it in. Card shows LOCKED IN (green) with an on/off switch.
- Bot checks every 15-min scan (autoCheck_). ENTER rules: 4H = TPI breakout or washout bounce; 1H/15m = EMA21>EMA50, close>EMA21 and EMA200, RSI 50-70, within 1.5 ATR of EMA21. Long only, WEEX coins only.
- Risk 10% of the amount (half while BTC gate down). TP1 1.5R sell 75% + stop to entry, TP2 2R rest, time stop 3h/8h/72h (manageAuto_). Tag AUTO-ENTRY, strategy AUTOE.
- Shared pot with the bot slice: Auto pot $15, max 3 open, daily stop $3, total stop $5 (AUTO_HALT; restart from Atlas). List in script property AUTOQ.
