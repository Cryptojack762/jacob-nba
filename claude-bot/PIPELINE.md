# Pipeline audit - 11/18/2026 3:15 PM CT

## Google limit that matters (verified, developers.google.com quotas page)
- Gmail accounts: all time-based triggers together get 90 min/day. Other limits: 20 triggers per script, 6 min per run, 20,000 URL fetches/day.

## Where the minutes go (sample: NBA project executions 5:10 AM - 2:52 PM, 200 runs)
- lpAuto (every 10 min, ~26 s): ~62 min/day  <- biggest
- hourlyAll (hourly, ~55 s): ~22 min/day
- autoJobs (every 15 min, ~12 s): ~19 min/day
- hourlyB (hourly split of hourlyAll, ~25 s): ~10 min/day
- ncbHourly + fbHourly2 (fbHourly2 only calls ncbHourly = same job twice an hour): ~6 min/day
- maxUpdate, misc: ~5 min/day
- NBA total: ~125 min/day (inferred from the sample). Bot scan every 15 min exits early between 4H candles (light).
- No failed runs in the sample and no Google failure emails, but the pace is over the 90-min line.

## Done today
- autoJobs: closing prices + pre-game warnings skip 2-9 AM CT. fbHourly2 turned into a no-op (duplicate of ncbHourly). YouTuber scan paused (vidIQ out of credits). claudeReview already caches by game, left as is. Worker idle poll 60 s (needs restart on server).
- lpAuto v2.4: edge scan, extras and CLV now run every 10 min 3 PM-2 AM CT, every 30 min 9 AM-3 PM, off 2-9 AM (order desk, results, retry, live positions still every 10 min). Saves ~25 min/day.
- Bot v30/v31: chat reads any BloFin coin; BloFin candle retries + WEEX fallback + 60 s cache.
- Atlas v25: signals show EXPIRED/DONE/OPEN, duplicates removed, bold text renders, new icon.
- 4:40 PM check-in task now points at the final pick (Lessons row 94).

## Next (in order)
1. Delete the fbHourly2 trigger (duplicate of ncbHourly).
2. hourlyAll: run claudeReview (Claude API) only at build/report hours, not every hour.
3. autoJobs: skip during 2-9 AM quiet hours.
4. Server-browser worker polls the bot every ~20 s all day (~4,000 web-app calls/day). Change idle poll to 60 s (needs one command in the DigitalOcean console).
5. Claude scheduled tasks: Daily YouTuber scan depends on vidIQ (out of credits) - pause until credits return. Heartbeat runs 5x/day.
