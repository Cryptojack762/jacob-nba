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
