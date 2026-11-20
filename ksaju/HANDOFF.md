# K-Saju handoff (for Dustin's Claude) — updated 2026-11-19

Live: https://cryptojack762.github.io/jacob-nba/ksaju/  (GitHub Pages, branch `main`; working branch `ksaju-site-v2`)

## What's live
- index.html = Dustin's v2 site (Haneul, form, result, paywall). Engine: js/saju.js (manseryeok@2.0.0, true solar time). Verified on 12 test birthdays.
- hub.html = Today / Library / Books / Me tabs (js/hub.js, css/hub.css). Bottom tab bar on index + hub.
  - Today: today's day pillar ((days since 1900-01-01 + 10) mod 60) vs user's Day Master element → Friend/Expression/Wealth/Pressure/Support message; tip of the day; streak; journal; reading-time picker. All saved on the phone (localStorage).
  - Library: lib/categories/<slug>/data.json + view.js (one folder + one script per category, 17 categories). lib/library.json = books, tips, state help lines.
  - Books: 10 public-domain books, "Listen" uses the phone's built-in voice.
  - Me: chart, help by state + 988/911/211, share, clear data.
- Installable app (PWA): manifest.webmanifest, sw.js (offline page, cached engine), js/pwa.js (install button + iPhone hint), img/icons, img/og.png share image. Chrome installability check: 0 errors.

## Switched off (buttons show "Soon") — turn on in js/config.js
- `mode: 'waitlist'` → 'live' turns on Stripe checkout (backend/Code.gs; needs live key in Script Properties).
- `gunghap: false` → compatibility.
- `features: { dailyPush, aiGuide, fullReport, proAudio, cloudSync }`.

## Open decisions (Jacob + Dustin)
- Brand name + domain, prices, Stripe account owner, narrated-audio source, launch Dec 15.
- On every deploy: bump VERSION in ksaju/sw.js.
