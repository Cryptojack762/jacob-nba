# WEEX futures API — what Claude's Auto Trading Bot uses (checked Nov 17, 2026)

Source: WEEX Developer Documentation (weex.com/api-doc), read in Chrome on 11/17. Public endpoints were tested live from Chrome (all returned 200).

## Accounts and keys (Jacob does these)
- Create the key on the WEEX website: Account → API Management → Create API Key. Up to 10 keys per user.
- Permissions are **Read** and/or **Trade**. New keys are Read Only by default; tick Trade (futures) for the bot. There is no withdrawal permission on API keys in the docs.
- You get 3 things: **API Key, Secret Key, Passphrase** (you make up the passphrase; if lost, make a new key).
- You can bind IP addresses to a key. The docs warn that unbound keys are a security risk. Our bot runs on Google's servers, which have no fixed IP, so the key can't be IP-locked → keep only Trade + Read, keep little money on the account, and delete the key if anything looks wrong.
- Keys go in the bot's Script Properties (WEEX_KEY, WEEX_SECRET, WEEX_PASSPHRASE). Never in the sheet, never in chat.

## Servers
- Live futures: `https://api-contract.weex.com`
- Simulated trading (listed in the docs): `https://api-sim.weex.com` — paper mode will use this once a key exists; until then paper fills are simulated in the sheet.

## Signing (verified from the Signature page)
- Headers: `ACCESS-KEY`, `ACCESS-SIGN`, `ACCESS-PASSPHRASE`, `ACCESS-TIMESTAMP` (milliseconds), `Content-Type: application/json`.
- String to sign: `timestamp + METHOD + requestPath + ("?" + queryString if any) + body`.
- `ACCESS-SIGN = Base64( HMAC_SHA256(secretKey, stringToSign) )`.
- Requests more than 30 seconds off server time are rejected (use GET /capi/v3/market/time if the clock drifts).

## Endpoints the bot uses
Public (no key, tested):
- Candles: `GET /capi/v3/market/klines?symbol=SOLUSDT&interval=4h&limit=500` → [openTime, open, high, low, close, volume, closeTime, ...]
- Ticker: `GET /capi/v3/market/ticker/24hr?symbol=SOLUSDT`
- Funding / mark price: `GET /capi/v3/market/premiumIndex?symbol=SOLUSDT` → markPrice, lastFundingRate, forecastFundingRate, nextFundingTime, collectCycle (480 min = every 8h)

Private (needs key):
- Place order: `POST /capi/v3/order` — body: `symbol`, `side` (BUY/SELL), `positionSide` (LONG/SHORT), `type` (LIMIT/MARKET), `quantity`, `newClientOrderId` (required, 1–36 chars), `timeInForce` (LIMIT only: GTC/IOC/FOK/POST_ONLY), `price` (LIMIT), `tpTriggerPrice`, `slTriggerPrice`, `TpWorkingType`/`SlWorkingType` (CONTRACT_PRICE or MARK_PRICE), `reduceOnly`.
  - Open long = BUY + LONG. Close long = SELL + LONG. Open short = SELL + SHORT. Close short = BUY + SHORT.
- Cancel: `DELETE /capi/v3/order?orderId=...`
- Close positions: `POST` Close Positions (Trade API page); conditional (trigger) orders: Place Conditional Order.
- Leverage: `POST /capi/v3/account/leverage` — `symbol`, `marginType` (CROSSED/ISOLATED), `isolatedLongLeverage` / `isolatedShortLeverage` / `crossLeverage`.
- Positions: `GET /capi/v3/account/position/allPosition`, `GET /capi/v3/account/position/singlePosition`
- Balance: `GET /capi/v3/account/balance`; fees: `GET /capi/v3/account/commissionRate`

## Rate limits
- Order placement is limited per account (ORDERS type); everything else per IP by weight. HTTP 429 = stop; abusing it gives a 10-second ban. The bot makes about 50–100 calls every 4 hours, far under any limit.

## Not verified yet (check when the key exists)
- Exact fees on Jacob's account (commissionRate endpoint).
- Whether api-sim.weex.com accepts the same key or needs a separate demo key.
- Whether WEEX blocks Google Apps Script server IPs (test with one Read call).
