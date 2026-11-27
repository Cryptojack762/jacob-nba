# NBA bot handoff (for Dustin's Claude) - 11/18/2026

## What it is
- Google Sheet "Jacob's NBA" (172p8NEQubZR94wgOM-l8CyDmHLd5kgJT03QpAxOU5eA) + its bound Apps Script. Bets on Kalshi NBA game markets (and combos/parlays) through the Kalshi API.
- Jacob ticks rows on Order_Desk; the bot places them (A1 = send every ticked row, K1 = kill switch). Nothing is placed without a tick.
- Read-only view of it lives in Atlas (Trades tab > NBA bets) via the trading bot's `bets_()`.

## Daily flow
1. 11 AM: morning dry run (Kalshi login, cash, combo create + read, RFQ quote then cancel). Result on Home C1.
2. 11 AM build + 4:30 PM fresh run (nmFreshRun): new sportsbook odds + late injuries + new Kalshi prices -> NBA MATH -> Blends_View (scored sets) + Order_Desk AWAITING rows.
3. Every 15 min before tip (pregame.gs): flags new OUT/Doubtful and 5c+ price drops. Tickets expire 10 min before Kalshi's tip time.
4. 11:50 PM Night Report grades everything. Claude writes lessons to the Lessons tab.

## Rules that came from real nights (keep them)
- Main tickets 2-4 legs. Lottos max 5 legs and $1-2. Never a leg under 10c (0 for 85 in tests).
- Exactly ONE hedge per set, capped at 10% of the set, decided before tip (the bot refuses hedges alone and started games).
- The "every favorite wins" night must be profitable or the set is rejected. Wipeout chance (lose every ticket) must be 2% or less.
- Cap any one team's share of the night.
- Live Kalshi prices within 30 min of picks; every injury claim gets a second source (a real OUT moves the Kalshi price).
- NEW 11/18: a favorite that drops 15c+ during the day gets pulled from mains; its money goes to that game's underdog (11/17: SAS fell 78 -> 55c and lost; DET hedge paid).
- Lean shape beat the optimizer on 11/17 (+$108 vs -$1): 2-3 straights, 1-2 two-leg mains, one hedge, one 2-leg lotto.

## What the tests say (Kalshi 2025-26 data)
- Only consistent edge: 90c+ favorites bought at the ask, about +1% to +5% (papers say ~1-3% long run). Everything else (momentum, revenge, fan sentiment, totals, fading streaks) is priced in.
- Kalshi parlays are priced against the buyer and get worse with more legs (~4% at 7 legs, ~22% at 10).
- Resting orders at the bid save ~2c per $1 but only fill about half the time, and the ones that don't fill are the better ones.

## Results so far (Kalshi-confirmed)
- 11/12 +$107 | 11/13 -$3.53 | 11/15 paper -$45 (not placed) | 11/16 +$36.42 | 11/17 +$103.45. Cash $279.83 on 11/18 1 AM.
- One-night results are noise. CLV over 300+ tickets decides if there's an edge.

## Where things are
- Lessons tab = full history of what broke and the fix. Brain tab = knobs (NM_WIPE_MAX, NM_FLOOR_PCT, NM_HEDGE_CAP, CB_* for Claude's paper bot).
- Claude_Bot tab = Claude's paper NBA bot (90c+ singles + small value lotto), $225 paper bank.
- Order_History = every ticket ever built.
