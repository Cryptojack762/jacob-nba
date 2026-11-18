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

## Portfolio rules (from NotebookLM sources + our tests)
- Equal margin per trade: 20% of equity, max 5 open, leverage 2x default (3x max) → each trade risks a small slice.
- Every order carries an exchange-side protective stop (3 × ATR14 from entry) so a server outage can't liquidate the account.
- Kill switch: stop opening trades if equity is 20% below its peak or down 5% in a day; Jacob turns it back on.
- Max hold: 120 candles (20 days) on any trade.
- Paper first (2–4 weeks), then live small.
