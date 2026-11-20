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

## Added 11/19 night (from competitor scan: Sajumuse, Master Sean Chan, Skillon, Co-Star)
- Today: "Good day or careful day" card (six clashes/combos/harms vs user's day branch + Nobleman, Peach Blossom, Travel Horse stars). Daily email sign-up.
- Ask Haneul chat (hub.html#ask): 1 free answer per phone, backend action `ask` (Claude API, daily cap CHAT_DAILY_CAP).
- Me: free compatibility score (compat.html), sample report (sample-report.html), Readings menu ($4.99 quick readings, couple, gift, chat credits = "Soon" until payments live; list in config.shop, prices in Code.gs PRODUCTS are placeholders).
- Library: 11 new categories (28 total, 143 entries): hidden stems, clashes/combos, shinsal, Korean almanac, dream dictionary, love, career/money, K-culture, Korean names, holidays, Purple Star. Each has a sheet tab (LIB_*) in "K-Saju Wellness Library - Master Data".
- Backend (backend/Code.gs) needs redeploy for daily email + chat: paste code → run setup() (adds Daily + Chat tabs) → run installTriggers() → Script Properties ANTHROPIC_KEY (+ optional MAIL_FOOTER mailing address) → Deploy > Manage deployments > edit > New version. Until then the app shows "opens soon" messages.

## Switched off (buttons show "Soon") — turn on in js/config.js
- `mode: 'waitlist'` → 'live' turns on Stripe checkout (backend/Code.gs; needs live key in Script Properties).
- `gunghap: false` → compatibility.
- `features: { dailyPush, aiGuide, fullReport, proAudio, cloudSync }`.

## Open decisions (Jacob + Dustin)
- Brand name + domain, prices, Stripe account owner, narrated-audio source, launch Dec 15.
- On every deploy: bump VERSION in ksaju/sw.js.

## Giun (기운) — Claude's own version (11/19 night)
Live: https://cryptojack762.github.io/jacob-nba/giun/ (separate installable app; K-Saju untouched)
- Same engine (ksaju/js/saju.js), same library (ksaju/lib), same backend (SITE.api). Chart saved on the phone is shared with K-Saju (same site).
- New look: hanji paper + ink-brush lettering; colors follow the day's element. Tabs: Today · Ritual · Library · Ask · Me.
- Today: day pillar message, good/careful day, morning/evening ritual card + streak, moon phase, solar term + Fire Goat countdown, tip.
- Ritual: element breathing (animated), 5 element meditations with Listen, evening gratitude journal, sounds (rain/stream/temple bell made on the phone).
- Library: all 28 sections + search + books with Listen. Ask: Haneul chat + compatibility. Me: chart, 5-week good-day calendar, share card + wallpaper, daily email, readings ("Soon"), help by state, light/dark.

## Psychology layer (11/19 late)
- NotebookLM: "K-Saju Library 5 - Psychology" (59 sources) and "K-Saju Library 6 - Psychology 2 (Elements, Korean, Moon)" (50 sources, 9 exact duplicates removed after asking NotebookLM).
- Library now 34 sections / 198 entries. New: Psychology (20), Relationships & Family (10), Emotions & the Five Elements (7), Korean Emotion Words (6), The Moon: Myth & Science (4), Crystals: Tradition & Truth (8). Sheet tabs LIB_* added.
- Giun "Talk it through" (#ask/mind): trouble type + text/mic -> chart lens (Ten God day, clash/combo, today's element emotion, missing element, moon) + 2 research tools + 3 "Did you" questions + next step + crystal ritual note; crisis words -> 988/911/DV hotline only.
- Backend v5: ask_ with mode 'mind' uses SYSTEM_MIND (lens never blames stars/moon; Gottman/CBT/self-compassion; crisis-only reply on danger). Live-tested 11/19.
- Rule: chart and moon are reflection lenses, never causes; crystals labeled tradition (placebo studies cited).

## 11/19 night: K-Saju hub now runs the shared Giun screens
- ksaju/hub.html loads ../giun/app.js + ../giun/style.css, then css/hub2.css (Dustin's night/gold look). Settings via window.APP_CFG in hub.html (brand, start page = index.html, share text, card tag).
- So K-Saju now has everything Giun has: Today plan, Ritual (breathe, meditate, timer, journal, sounds, calendar reminder), Talk it through, library search + today's pick, good-day calendar, share card + wallpaper, waitlist. One code base: fix giun/app.js once, both apps update.
- Tabs on index + hub: Reading · Today · Ritual · Library · Ask · Me. js/hub.js is no longer used (kept for reference).
