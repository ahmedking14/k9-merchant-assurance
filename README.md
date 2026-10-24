# K9

A Kane CLI Hack Day project: simulated shoppers challenge a specific storefront promise, and Kane can verify the real browser journey.

## One-sentence pitch

Five shopper archetypes pursue goals rooted in a store claim. The app compares control and challenger journeys, and Kane independently verifies the real browser cart. A confirmed challenger discount defect was repaired and the same generated Kane test passed on rerun.

## Product objective

K9 finds the gap between a commerce promise and the outcome a shopper actually receives. The core loop is: define a claim, compare the same shopper goals against control and challenger storefronts, then verify the real browser journey with Kane CLI. Local simulations are directional and are never presented as Kane evidence.

## Current scope

MONOFORM is a fictional design-led electronics store with four shoppable products, a cart, and a demo order result. The control room can run 5, 25, or 100 local shopper evaluations across five archetypes and compare A/B variants. Each run now creates timestamped, modelled journey events. The demo storefront records observed browser interactions separately. It can probe discount, dynamic pricing, shipping, marketing copy, stock, coupon eligibility, and returns. OpenAI planning is optional; without an API key, the app clearly labels its deterministic demo planner. The local results are never labeled Kane evidence. In Evidence room, select a time range and source to inspect chronological friction buckets, hotspots, and individual sessions. Import a Kane CLI `events.ndjson` file for a separate step-by-step run summary, and keep the sealed evidence pack or report link for independent proof.

The focused hack-day flow is the **20% first-order offer**. Evidence room shows the Kane assurance stages, generated tests, coverage, paired red and green browser receipts, and a prioritized proposed-fix list from **K9 Triage Agent**. The red run is a Kane-confirmed product defect, not a separate failed numerical assertion. The green run asserts the displayed `-$37.80` discount and `$151.20` total. The agent uses the OpenAI Responses API when `OPENAI_API_KEY` is configured; otherwise its output is labeled as a rule-based preview. The exact Kane commands and review gates are in [docs/assurance-demo.md](docs/assurance-demo.md).

See [docs/hackday-plan.md](docs/hackday-plan.md) for the build sequence and judging checklist.

## Status

- Web app and store implemented; local contract check passes with `npm run check`.
- Kane's generated challenger test passed after a confirmed red defect and repair. The control replay passed. Project coverage is 13.4% (3 of 4 designed criteria proven); the returning-shopper criterion is deferred.
- Solo team. No public repo or event submission claimed yet.
- The local dev server runs on port 4173. Evidence room reads captured Kane receipts separately from local simulation telemetry.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`. No dependencies need installing. Run `npm run check` for the store contract and telemetry range checks. The app runs a clearly labeled local cohort simulation by default. To enable OpenAI shopper planning, set `OPENAI_API_KEY` in your own terminal environment before starting the server; never commit it. The server uses the [OpenAI Responses API structured output format](https://developers.openai.com/api/docs/guides/structured-outputs).

The storefront and control room use real stock photographs from Unsplash as fictional demo imagery under the [Unsplash License](https://unsplash.com/license). Products and brand are invented; no purchases or payments occur.
