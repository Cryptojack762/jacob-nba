# Claude's Auto Trading Bot — Strategy Playbook (Nov 17, 2026)

Every rule below was backtested by Claude in Chrome on real candles, 20 coins, with fees, entry at the NEXT candle's open.
- In-sample (IS): BloFin 4H/1H, Nov 2024 – Nov 2026.
- Out-of-sample (OOS): Binance 4H, Jan 2021 – Nov 2024 (2021 bull, 2022 bear, 2023–24 recovery), 18 coins.
- PF = dollars won per dollar lost. "Halves" = first half / second half of the period.
- WEEX fees (verified from WEEX exchangeInfo): maker 0.02%, taker 0.08% → 0.16% round trip with market orders. Numbers below use 0.16% unless noted.
- BTC filter = BTC 4H close above (up) or below (down) its 200 EMA.

## ✅ IN THE BOT (passed both periods)

### LONG 1 — TPI Donchian (4H)
- Entry: close > highest high of last 40 candles, close > EMA200, RSI14 > 55, ATR14 < 5% of price, BTC up.
- Exit: close < lowest low of last 20 candles, or RSI14 < 40.
- IS: 434 trades, 36% win, +1.87%/trade, PF 1.58, halves 1.39/1.82, 18/20 coins up.
- OOS: 803 trades, 38% win, +3.94%/trade, PF 2.08, lost only in 2022 (PF 0.75).
- Random long entries in the same BTC-up regime: +0.06%/trade → the rule adds ~1.8%/trade.

### LONG 2 — SuperTrend 30/5 + BTC filter (4H)
- Entry: SuperTrend (ATR 30, multiplier 5) flips up while BTC is up.
- Exit: SuperTrend flips down.
- IS: 259 trades, 38% win, +1.90%/trade, PF 1.40 (halves 1.02/1.96).
- OOS: 404 trades, 41% win, +6.54%/trade, PF 2.30, 17/18 coins up.

### SHORT 1 — Funding-extreme short (4H, 72h hold)
- Entry: at a funding settlement, the coin's funding rate is in its top 5% of the last 90 settlements AND BTC is down.
- Exit: after 18 four-hour candles (72 hours).
- IS (0.12% fees): 676 trades, 57% win, +0.87%/trade, PF 1.39 (halves 1.21/1.75).
- OOS (0.12% fees): 1,911 trades, +1.04%/trade, PF 1.49.
- Beat random shorts in the same BTC-down regime by about +0.6%/trade in BOTH periods → the funding signal is real.

### SHORT 2 — Bollinger + RSI downtrend short (4H)
- Entry: BTC down, coin close < EMA200, close > upper Bollinger Band (20, 2), RSI14 < 70.
- Stop: entry + 2 × ATR14. Exit: close < lower Bollinger Band, or after 30 candles.
- IS: 393 trades, 42% win, +0.32%/trade, PF 1.13. OOS: 649 trades, 47% win, +0.56%/trade, PF 1.21 (2021 1.55, 2022 1.52, 2023 0.95, 2024 0.48 — weak lately, small size).
- Source idea: Coinrule "Shorting when Bollinger Band above price with RSI" (NotebookLM notebook "Claude's Auto Trading Bot"); the original (no trend filter) failed OOS (PF 0.90) — the BTC-down + EMA200 filter is what makes it work.

### LONG 3 (optional, small) — Funding-extreme long (4H, 72h)
- Funding in bottom 5% of last 90 AND BTC up. IS +0.98%/trade PF 1.42 (564 trades); OOS +1.32% PF 1.58. But only +0.12%/trade better than random longs in 2021-24 → mostly the BTC trend doing the work. Off by default.

## ⚠️ WATCH LIST (marginal — paper only)
- EMA50 rejection short (4H): downtrend (EMA50 < EMA200, BTC down), candle tags EMA50 from below and closes red under it; stop high + 0.5 ATR, target 2R, max 30 candles. IS PF 1.03, OOS PF 1.08. Too thin after fees.

## ❌ REJECTED (lost money or only worked in one period)
- Donchian breakdown short (mirror of TPI): IS PF 0.65 — shorting breakdowns loses (crypto snaps back).
- Failed-breakout short: IS PF 1.33 but OOS PF 0.98 → overfit to 2024–26.
- RSI overbought fade short: IS 1.20 (97 trades), OOS 0.85.
- SuperTrend flip short: IS 0.78. EMA50 cross-down short: IS 0.80.
- Plain Bollinger + RSI short (no trend filter): OOS 0.90.
- EVERY 1-hour (day-trade) strategy, long or short: PF 0.81–0.97 after fees; still ~1.00 even at maker-only fees → no edge on 1H, not just a fee problem. Moon Dev and NotebookLM sources agree: 1-minute to 1-hour edges die after costs.

## Why no day-trade shorts
Tested 9 rules on 1H (2,000–5,000 trades each). None beat break-even before fees. The bot trades the 4H chart only; the 15-minute chart is used only for Jacob's manual "reload" exits.

## ROUND 2 (Nov 17 night) — bottoms, short exits, hedging
Same engine, same fees. IS = BloFin 2024–26, OOS = Binance 2021–24. Notebook got 2 more Fast Research imports (bottom indicators, hedging) → 30+ sources.

### Catching a bottom on one coin — ❌ none work
- RSI<30 hook (buy when RSI comes back above 35): IS PF 0.92, OOS 1.02.
- Capitulation volume (close under BB 2.5, volume 3x): IS 1.38, OOS 0.84 → fails.
- Capitulation then reclaim EMA20: IS 0.77, OOS 1.32 → coin flip.
- Deep discount (25% under EMA200) then reclaim EMA20: IS 0.86, OOS 1.10.
- Bullish RSI divergence at a 90-candle low: IS 0.55, OOS 1.06.
- BTC SuperTrend flips up while BTC is still under EMA200: IS 0.41, OOS 0.64 (worst).
- Random longs while BTC is down: IS 0.94, OOS 0.90. Bottom signals barely beat random.
- NotebookLM agrees: VanEck found capitulation clusters gave 12.8% over 90 days vs a 15.2% baseline — they mark cycle floors, not 4H entries.

### Market-wide bottom signal — ⚠️ promising, alert only
- BTC funding at or below -0.01% per 8h (shorts paying longs) → go long alts for 72h.
- IS only (no older funding data reachable): 702 trades, 57% win, +1.91%/trade, PF 2.12. Random longs at the same times: PF 0.92.
- Only 27 separate episodes in 2 years; 17 green. One episode (Aug 19 2026) made +32%; without it the average is about +1%.
- Wider version (BTC funding in its bottom 5% of last 90): PF 1.36, 1,280 trades.
- In the bot: "Bottom alert" ON (alert only); "M_BOTTOM" trade OFF until it is proven on more data.
- NotebookLM thresholds for the same idea: funding ≤ -0.01% (or z-score ≤ -2), open interest down 30–65% fast, long liquidations z ≥ +2 with price reclaiming half the wick within 1–4h, MVRV < 1 (cycle floor, not timing). Caution from the sources: on altcoins, negative funding is often market makers hedging inventory, not crowded shorts — so the bot uses BTC's funding, not the coin's.
- BTC washout wick (huge 4H range, closes in upper half): IS PF 7.3, OOS 0.65 → overfit, rejected.

### When to exit a short (Jacob: "exit the short when the long would enter")
- Base BB+RSI short: IS 1.21, OOS 1.23.
- + exit when the coin's SuperTrend flips up (a long trigger): IS 1.20, OOS 1.27 → ✅ added to the bot (helps or is neutral).
- + exit when BTC goes back above EMA200: IS 1.00, OOS 1.33 → mixed, not added.
- Exit ONLY on long triggers (no BB exit): IS 1.13, OOS 1.37 → mixed.
- + exit on RSI<30 or RSI hook: no change.
- + exit when BTC funding hits its bottom 5%: IS 1.22 (no change).

### New short entries
- BTC breakdown short (BTC closes under its EMA200 → short coins under their EMA200, cover when BTC is back above): IS PF 1.15 (955 trades), OOS 1.30 (992). Halves uneven (0.94/1.39, 1.73/0.86) → ⚠️ watch list, "S_BTCFLIP" OFF.
- Rally-fade (RSI drops back under 60 in a downtrend): IS 1.35, OOS 1.03 → overfit.
- Death cross (EMA50 under EMA200): IS 1.10, OOS 0.94 → rejected.
- Lower-high at EMA50: IS 1.06, OOS 1.03 → too thin.
- Random shorts while BTC is down: IS 0.96, OOS 1.02.

### Hedging — ❌ static hedge hurts
Tested on every TPI and SuperTrend long, both periods:
- No hedge: TPI OOS +3.22%/trade PF 1.85; SuperTrend OOS +5.82% PF 2.36.
- 50% BTC short for the whole trade: profit cut 20–25%, drawdown NOT smaller (TPI OOS worst trade -14.9% → -19.5%).
- 100% BTC short: profit cut ~45%, worst trade even worse (SuperTrend OOS -28% → -55%). Alts fall harder than BTC, and the long's own stop already does the job.
- Hedge only while BTC SuperTrend is down: about neutral (-0.1%/trade, small drawdown changes either way).
- Hedge only when BTC RSI > 70: hurts.
- NotebookLM sources agree: static hedges lose to execution costs + funding (AIMS Press example: +41% → -16%); hedging helps only when gated by a volatility regime.
- What works as a hedge instead: (1) the 3×ATR stop on every trade, (2) running the short book next to the long book — shorts are uncorrelated with longs (monthly correlation 0.04 IS, -0.07 OOS) and were green in 14 of 26 losing long months OOS, adding 10-18% to total profit.
- Jacob's betting rule "everything has a hedge" → for the bot the hedge = stop + short book, not a BTC short.

## ROUND 3 (Nov 17, 8 PM) - scavenged from Jacob's other sheets
Sheets read: Phoenix (BloFin Rules, BloFin Triggers, Pick Triggers, Trigger Record), Crypto Playbook Library (Backtest Map), bullrun 2027 (Bottom Watch), Perp Forward Test Log. Dustin's sheets only read, never changed.
Same engine, IS 2024-26 / OOS 2021-24, 0.16% fees.
- Playbook #15 breakout (48-candle high, BTC up, exit 24-candle low): IS PF 1.54, OOS 1.81. Real - but it is the same trade as TPI. Taking its extra trades when TPI is not firing: IS PF 1.02 (nothing). Not added; it independently confirms TPI.
- Playbook #16 breakdown short (48-candle low, 3R target): IS 0.96, OOS 0.98. Rejected (same as our earlier Donchian short).
- BloFin AI "chandelier 3 ATR" exit: worse than current exits (TPI OOS PF 1.85 -> 1.74, SuperTrend 2.36 -> 1.87). Not added.
- BloFin AI rule "48h cooldown on a coin after a loss": TPI IS 1.46 -> 1.36, SuperTrend IS 1.46 -> 1.34, OOS unchanged. Not added (the 3 ATR stop already caps the damage it was meant to stop).
- BTC gate = 20-day average (Phoenix) vs BTC EMA200 (bot): EMA200 better on TPI (IS 1.46 vs 1.27). Bot keeps EMA200.
- Phoenix EMA21/50 swing rule (Playbook #13): -0.07R/trade over 1,203 trades. Shown in the app as information only, never traded.
- Phoenix Trigger Record day plans use 17-50x leverage; BloFin AI's own review of Jacob's 55 trades says cap at 10x (28 of 31 liquidations were above 10x). The bot stays at 2x.
- What was carried over: Phoenix Pick Triggers (top 8 by readiness, Dustin score kept) and Bottom Watch (forming/confirmed only) now show in the phone app, read-only.
- BloFin AI hard rules already in the bot: stop on every order, max hold, kill switch, leverage cap. Its "max 2 new entries a day" is covered by max 5 open.

## Portfolio rules (from NotebookLM sources + our tests)
- Equal margin per trade: 20% of equity, max 5 open, leverage 2x default (3x max) → each trade risks a small slice.
- Every order carries an exchange-side protective stop (3 × ATR14 from entry) so a server outage can't liquidate the account.
- Kill switch: stop opening trades if equity is 20% below its peak or down 5% in a day; Jacob turns it back on.
- Max hold: 120 candles (20 days) on any trade.
- Paper first (2–4 weeks), then live small.

## ROUND 4 — Day-trade (1H) research for WEEX (11/18, 12:10–12:40 AM)

Data: BloFin 1H candles, 12 coins (BTC ETH SOL XRP DOGE BNB ADA AVAX LINK SUI LTC DOT),
2024-09-29 → 2026-11-18 (18,720 bars each). In-sample before 2025-11-01, out-of-sample after.
Costs: 0.15% per round trip (WEEX taker 0.06% x2 + slippage). Entry next bar open. ~30 backtest runs.

Verdict per idea (IS PF / OOS PF):
- 24h breakout long, trend-gated: 0.92 / 0.87 — FAILS
- 24h breakdown short: 0.96 / 1.02 — flat, FAILS after costs
- RSI(2) dip-buy long: 0.90 / 0.61 — FAILS
- RSI(2) fade short: 0.85 / 0.81 — FAILS
- EMA50 pullback long/short: 0.77/0.64 and 0.87/0.97 — FAILS
- Bollinger squeeze breakout: 1.00 / 0.92 — FAILS
- Fade big volume candles: 0.74 / 0.69 — FAILS (do the opposite)
- **Volume-spike momentum long (L_VOL1H): 1.54 / 1.43 — ONLY PASS**
  Rule: 1H volume > 3x its 24h average AND the 1H candle closes +2.5% or more above its open
  AND close > 1H EMA200 → buy next bar open, stop 1.5 ATR(14), exit after 6 hours.
  377 trades total, 49% win, +0.39% avg per trade OOS (unlevered, after costs).
  Robust: all 9 volume/size combos positive OOS; stop 1–3 ATR all positive; 9/12 coins positive OOS.
  Weak spots: holding 12–24h kills it (keep 6h); volume-spike SHORT fails OOS (0.74);
  adding BTC/coin trend filters made it WORSE (OOS 0.62–0.91) — skip filters.
  Recent decay: Aug–Nov 2026 net negative (-21% summed over 60 trades). Paper it first.

Lesson: on 1H with real fees most classic day-trade setups lose. The 0.15% cost eats any
edge under ~0.3% per trade. Only big, volume-confirmed moves are worth chasing.
Next: add L_VOL1H to the bot as PAPER-only (1H scan), compare 4 weeks vs backtest.

## ROUND 4b — 4H long-trade rules for BloFin (20 coins, 4H, 2023-08 → 2026-11; OOS from 2025-06-01; 0.12% costs)
- **L_RSI20 bottom bounce — BEST FIND.** Coin below 4H EMA200, 4H RSI14 under 20 then closes back ≥20 →
  long next bar, stop 2 ATR, target 2 ATR, max 12 bars. IS PF 2.64 (149t, 67% win) / OOS PF 2.22 (124t, 61% win).
  All 4 stop/target combos PF 1.74–2.86 OOS. 17 of 20 coins positive OOS. RSI threshold 25 still works (1.48), 30 fails (0.92).
  Holding past 2 days kills it (24 bars: OOS 1.00). Rare: ~1 signal per coin per 4 months.
- TPI (40-bar high, >EMA200, RSI>55, exit <EMA50): 1.46 / 1.41 — confirmed again.
- EMA50 reclaim: only works ABOVE EMA200 (1.27/1.17); below EMA200 it fails (0.94). SOL is below → do not use for SOL now.
- EMA20 dip-bounce ("pullback reload"): 1.06/0.79 — FAILS. Removed from trust.
- Short breakout above 24h high (like BloFin AI's "1H close above X" trigger): 0.90 / 0.90 — FAILS.
- 4H volume spike long: 1.31 / 1.18 with EMA200 filter — weak pass.
App: BloFin tab now has a live L_RSI20 scanner for 20 coins; failing rules are labelled "backtest FAILS".

## ROUND 4c — L_RSI20 is a MARKET WASHOUT signal (00:20–00:35 AM)
- Signals cluster on crash days (2024-08-05, 2025-04-07, 2025-10-11, 2026-01-31: 15–18 coins same day).
- Crash-day signals (4+ coins same day): +0.24R avg, 68% win. Lone single-coin signals: -0.08R, 48% win → LOSE.
- Causal breadth filter (count coins that fired in the prior 24h incl. this one), OOS results:
  k>=1 PF 2.22 · k>=2 2.60 · **k>=3 2.87 (102t, 66% win)** · k>=4 2.84 · k>=6 3.25. Rule now: need 3+.
- Sizing sim (1% account risk per trade, no breadth filter): $100 → $177 over 3.5 yrs, max drawdown 13%, worst losing streak 13.
  Capping trades per day HURTS (cap 3 → $109): on washout days take every signal.
- 4H shorts tested in downtrends — none reliable: RSI70 fade 0.75/2.44 (fails IS), rally-to-EMA50 1.15/1.02, 40-bar breakdown 0.88/1.19.
- 11/18 12:28 AM: L_RSI20 added to the bot (Code.gs, deployment v6). ON by default, Paper mode. Needs 3+ coins in the
  WASH property (24h window). Stop 2 ATR, target 2 ATR (entry*2 - stop), exit after 12 bars. Logs a WASHOUT row when breadth >= 3.
- TPI exit check (20 coins 4H): EMA50 exit 1.30/1.41, EMA20 1.16/1.33, RSI<45 1.29/1.40, 30-bar time 1.29/1.44 — keep current exits.

## LESSONS LOG 11/18 (numbered, keep adding)
1. EMAs are a filter, not a trigger. Breakouts only on 4H. Washout bounce needs 3+ coins firing in 24h. No day trades under 30 min.
2. BloFin Grid and DCA bots skipped (no tested edge). Signal Bot is the only fit: needs paid TradingView + a Pine strategy, $50 minimum.
3. Server runs 24/7 on DigitalOcean, now 2 GB / $12 a month. Exchange keys are IP-locked to 157.230.148.63.
4. Going live: reset PEAK and DAY_START to the real balance first (or the kill switch fires). Money must sit in Futures, not Spot.
5. Atlas: Trades tab scores by tag (You tapped / Bot / Missed / Practice). Ask Claude uses the bot chat (Phoenix script has no key).
6. 4H volume spike (3% candle, 2x volume, exit 24h): out-of-sample PF 1.27, 97 trades, 38% win. Weak pass, scanner only.
7. WEEX leverage call needs both isolatedLongLeverage and isolatedShortLeverage; allPosition returns an array (empty when flat).
8. ForexFactory XML times are GMT. Don't add 5 hours (FOMC minutes = Wed 1:00 PM CT).
9. NBA 11/17 +$103.45: favorite that dropped 23c during the day (SAS) lost; hedge on its game paid. Lean shape beat NBA Math by $109.

## FOMC MINUTES WED 11/18 1:00 PM CT (researched 6:30 AM, sources: FinanceFeeds 11/18, Bitcoin.com 11/14)
- Minutes of the Oct 28 meeting: Fed HELD 3.75-4.00%, vote 10-2, Cook and Hammack wanted a hike.
- Priced in: December 8-9 HIKE of 25 bp ~92-96% (CME FedWatch 95.7%, Polymarket 92%, Kalshi ~89% on 11/14). Cuts are off the table.
- Why: Oct CPI +0.4% vs 0.3% forecast, payrolls +165k, Brent over $100.
- BTC ~$64.7k (down 12% week, 21% month). Support $62-66k buyer block, then $58.5k June low. Resistance $74.1k (short-term holder cost).
- BEFORE line: a hike is already priced. More hawkish talk (2+ hikes, more dissents) = likely another leg down toward $62k; any "pause after December" hint = relief bounce.
- Past reactions (inferred from headlines, not measured): Nov 2025 minutes -> BTC extended losses; hawkish minutes usually = small dip in the hour after.
- Bot: event pause blocks new entries 12:00-2:00 PM CT (60 min each side).

## ROUND 5 (11/18 9:50 AM) - checks on the 4H BTC-side breakout (12 coins, BloFin 4H, Apr 2024 - Nov 2026, 0.16% round-trip fees)
Rule: LONG 4H close above 48-candle high while BTC > 20-day avg, stop 2 ATR, exit close under 24-candle low. SHORT close under 48-candle low while BTC < 20-day avg, stop 2 ATR, target 3R.
- Baseline: 932 trades, +0.29R avg, PF 1.40 (long 428t PF 1.69, short 504t PF 1.16).
- #22 Latest 3 months still works: 89t, PF 1.43 (long 1.63, short 1.33). Holding up.
- #21 Breakeven after +1 ATR: PF 1.66 (vs 1.40), total +290R vs +266R, but win rate drops to 14% (many scratches). Weak pass - optional.
- #18 Choppiness filter (CHOP<61.8): no change (929t, PF 1.40). Breakouts already avoid chop. REJECTED (adds nothing).
- #28 Fees: limit entries (0.04% total) +0.32R/trade vs market (0.12%) +0.30R. Limit orders add ~+12% total R. Use limit when the setup isn't racing.
- #26 Washout bounce on BTC/ETH alone (no 3-coin breadth): 36t, PF 1.08. FAILS - keep the 3+ coins rule.
- #25 Risk per trade for $50 with 20% max drawdown (trades in sequence, bootstrap 2,000 runs): 0.5% risk -> $50 to $171, median worst drop 16%, 22% chance of a drop over 20%. 1% risk -> median drop 30% (96% chance over 20%). Answer: 0.5% risk or less per trade (about $0.25 of a $50 account) to stay near 20%.
- Split test (first 60% of dates = in-sample, last 40% = out-of-sample), long side only:
  - 4H breakout base (trailing 24-low exit): IS PF 2.21 (292t) -> OOS PF 1.22 (165t). Still positive but much weaker lately.
  - #14 S57 fixed 3.5 ATR target instead of trailing: IS 1.15 -> OOS 0.88. REJECTED (trailing exit is better).
  - #15 S60 wait for pullback to the breakout level (within 6 candles): IS 2.00 -> OOS 1.07. REJECTED (no better than base, fewer trades).
  - #11 S56 daily close crosses above 50-day avg with ADX>25: IS 0.26 / OOS 0.88. REJECTED.
  - #12 S59 28-day momentum (top 3 coins weekly, BTC up): IS PF 1.46 -> OOS 0.84. REJECTED (worked early, failed lately).
- #77 FOMC days (BTC 4H, Apr 2024 - Nov 2026; minutes dates estimated as decision + 3 weeks, 2 PM ET):
  - Decision days: average 24h move 2.24% vs 1.75% on a normal day (+28% bigger). Up 10 of 21.
  - Minutes releases: average 24h move 2.20%, up only 8 of 20, first 4 hours average +0.14% (no real direction). Biggest: Aug 2026 +6.7%, Jul 2024 -4.4%.
  - Verdict: bigger swings, no reliable direction -> keep the event pause (no new entries 1h before/after), don't bet on a direction.
- #45 Paper shorts opened 11/17 8 PM CT, graded 11/18 ~10 AM CT (BloFin last price, still open, stops not touched):
  SOL S_BBRSI 74.13 -> 73.40 = +$0.73 | NEAR S_BBRSI 3.351 -> 3.215 = +$3.13 | HYPE S_FUND 68.646 -> 65.953 = +$2.96. All 3 green, +$6.82 paper so far.

## KALSHI BTC (#83-86) - mapped 11/18 10:00 AM CT
- Markets (series KXBTCD, "BTC price at time X"): hourly events (strikes every $100, close on the hour ET), a daily 5 PM ET event (strikes every $250), and a Friday 5 PM ET weekly (strikes every $500). Each strike = "$K or above" YES/NO. Big volume (50k-150k contracts near the money). Fee = Kalshi's normal taker fee (~7% x p x (1-p)).
- Our method: chance BTC ends above K = empirical 6h move distribution from 838 past days (same 4-10 PM CT window, BloFin 1H), scaled by the last 24h volatility. Past moves run 23% bigger than trailing vol says (built in). FOMC day: vol x1.25.
- 11/18 5 PM ET read (BTC $63,142, 6.1h left): Kalshi vs ours (FOMC-adjusted)
  $62,000 88 vs 93 | $62,500 76 vs 84 | $62,750 67 vs 74 | $63,000 56 vs 61 | $63,250 45 vs 45 | $63,500 34 vs 30 | $63,750 24 vs 18 | $64,000 17 vs 9 | $64,500 8 vs 4
- PAPER PICKS (nothing sent, $10 each): YES $62,500+ at 76c (ours 84) | NO $64,000+ at 84c (ours 91 below) | NO $63,750+ at 77c (ours 82 below). Grade after 5 PM ET.
- Caution: Kalshi's wider tails may be pricing the 1 PM CT minutes better than our trailing vol. Needs 30+ graded days before any money (#85). Same rules as NBA if it ever goes live: one hedge, plain dollars.

## NotebookLM prompt (short, for the strategy library notebook)
Using only these sources, list every crypto strategy that passed out-of-sample, one line each: rule, timeframe, profit factor, trades, and why it might stop working. Then list the rejected ones in one line each. No intro.
- Batch 3 (20 coins, BloFin 4H Aug 2023 - Nov 2026, first 60% in-sample / last 40% out-of-sample):
  - Washout bounce (3+ coins in 24h) still holds: IS PF 4.67 (126t) -> OOS PF 1.63 (102t, 66% win). Best rule we have.
  - #19 MFI under 20 on top of washout: OOS PF 1.24 (worse than without). REJECTED.
  - #17 Double bottom neckline break (lows within 3%, measured-move target): IS 0.99 / OOS 0.85. REJECTED.
  - #20 Daily pivot R1/R2 as the target on the 4H breakout: OOS PF 1.14 vs trailing exit 1.15, but wins 45% of trades instead of 26%. Same money, smoother ride - optional.
  - WARNING: 4H breakout long on 20 coins over 3.3 years is only PF 1.15 out-of-sample (IS 2.41). It is fading. Keep its size small; washout bounce deserves more weight.
- #30 6-month replay of the bot's long rules with the live slice (18 coins, BloFin 4H, May-Nov 2026, $2 margin x 10x = $20 position, max 3 open, one per coin, 0.16% fees):
  409 signals, 59 taken. Total +$24.60 on the $16 slice. Worst drop -$14.30 (almost the whole slice before it recovered).
  L_TPI 44 trades, 27% won, +$27.17 | L_RSI20 15 trades, 60% won, -$2.56 | L_ST 0 taken (BTC under its EMA200 most of the period / slots full).
  Stops at 10x: median 3 ATR stop is 3-7% on big coins (fits under ~9.5% liquidation); NEAR and ZEC run ~11% (bot skips those, by design).
  Read: positive but bumpy; a -$14 drop on a $16 slice is normal for this system. Keep the slice where it is.

## Market News NotebookLM hook (#82)
- Weekly: copy the bot sheet's Reports tab (release, forecast, actual, BTC +1h/+4h/+24h) into the Market News notebook as a source.
- Prompt (short): "You're talking to Claude through Jacob's copy-paste relay. Using the Reports source, which US releases moved BTC most in the 4h after, and in which direction when the number beat vs missed forecast? One line per event type. Flag anything with under 5 samples."
- Ties to the event pause: if a release type shows bigger moves than FOMC (2.2% avg 24h), add it to the pause list.
