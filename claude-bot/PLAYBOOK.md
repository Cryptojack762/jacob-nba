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
