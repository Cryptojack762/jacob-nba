# Work Engine - how Claude works through TODO lists fast (Jacob, 11/18/2026)

Goal: finish the most valuable items per unit of usage, never stall on Jacob, never break live money.

## 1. Pick the next item (score every open item, highest first)
Score = Money safety (x3) + Jacob can see it today (x2) + Unblocks other items (x2) - Usage cost (x1)
- Money safety 3 = protects real money (stops, reconcile, kill switch, event pause)
- Visible 2 = shows up in Atlas / sheet when he opens it
- Unblocks 2 = other items wait on it (e.g. deploy, data feed)
- Usage cost 1-3 = small edit 1, new feature 2, long backtest / browser install 3
Ties: smaller item first. Anything that needs Jacob (login, money, a choice) -> "Yours" list, skip to next.

## 2. Batch to save usage
- Group code changes that touch the same file into ONE commit + ONE deploy (Apps Script deploy = ~6 browser steps; never deploy per tiny change).
- Front-end (index.html) changes need no deploy: commit + push, VPS pulls every 5 min.
- Read data once, compute in code (JS in the browser or Apps Script), only print a short summary.
- Use the Sheets connector for sheet writes (cheap); Chrome only for Apps Script deploys, exchange pages, live tests.
- Backtests run in the browser on BloFin candles fetched once per session (window cache).

## 3. Fixed routines (copy, don't re-figure)
Deploy bot (Apps Script):
1. git push -> note short commit hash
2. Editor tab: fetch raw.githubusercontent.com/Cryptojack762/jacob-nba/<hash>/claude-bot/Code.gs, check a marker string, monaco.editor.getModels()[0].setValue(t)
3. click editor, ctrl+s, close account popup
4. find "Deploy" -> "Manage deployments" -> Edit -> Version combobox -> "New version" -> Deploy (use find refs, not coordinates)
5. confirm "Version N" text, then hit one endpoint to prove the new code is live
Front-end: edit index.html with python rep() (assert exactly 1 match), bump sw.js cache name, headless Playwright load = no errors, commit, push.
Live check: open https://157-230-148-63.sslip.io/atlas/ in Chrome, run the view-by-view self-test (every view renders, no "offline/Error/Loading" flags).

## 4. Safety gates (never skip)
- Never place, close or change a real trade except via Jacob's tap or a rule he approved (bot slice, missed-trade fallback).
- Every new order path: test the refusals first (bad leverage, wrong-side stop, too-far stop) with no real order.
- Anything touching money logic: syntax check (node --check) + one dry-run before deploy.
- Mark every claim verified vs inferred; untested strategies labelled "untested" in the app.

## 5. Checkpoints
- After each item: tick it in TODO_2026-11-18.md, commit + push (stop hook requires a clean repo).
- Every ~30 min or 5 items: one short status to Jacob (done / next / needs you).
- Stop when: list done, usage limit near, or a decision only Jacob can make blocks everything left.

## 6. Order right now (from the scores)
1. Deploy #90-92 (event pause, bot slice, missed fallback) - money + before FOMC
2. #93 reconcile closed trades - money safety, needed before the bot trades alone
3. #33 multi-TP + trailing stop, #32 15-min exit checks - money
4. #87-88 Bets tab + bankroll line - visible
5. #94 Phoenix real app - visible, small
6. #64-65 all-coins scanners - visible
7. Server browser (#1-6) - unblocks PC-off, big
8. Backtests (#11-30, #77, #85) - batch in one browser session
9. Notes/handoffs (#40-45, #57-61), NBA chores (#46-56)
