# Swarm vs. Store

A Kane CLI Hack Day project: simulated shoppers challenge a specific storefront promise, and Kane can verify the real browser journey.

## One-sentence pitch

Five shopper archetypes pursue different goals rooted in a store claim. The app compares a healthy control with a challenger that drops the first-order discount in cart. A Kane run will independently verify the browser journey; the coding agent can then use its evidence to fix and rerun the flow.

## Current scope

MONOFORM is a fictional design-led electronics store with four shoppable products, a cart, and a demo order result. The control room can run 5, 25, or 100 local shopper evaluations across five archetypes and compare A/B variants. It can probe discount, dynamic pricing, shipping, marketing copy, stock, coupon eligibility, and returns. OpenAI planning is optional; without an API key, the app clearly labels its deterministic demo planner. The local results are never labeled Kane evidence.

See [docs/hackday-plan.md](docs/hackday-plan.md) for the build sequence and judging checklist.

## Status

- Web app and store implemented; local contract check passes with `npm run check`.
- Solo team. No public repo, Kane run, or event submission claimed yet.
- Browser verification is pending because this Codex sandbox cannot bind a local port and Kane CLI is not signed in.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`. No dependencies need installing. Run `npm run check` for the store contract check. The app runs a clearly labeled local cohort simulation by default. To enable OpenAI shopper planning, set `OPENAI_API_KEY` in your own terminal environment before starting the server; never commit it. The server uses the [OpenAI Responses API structured output format](https://developers.openai.com/api/docs/guides/structured-outputs).

The storefront and control room use real stock photographs from Unsplash as fictional demo imagery under the [Unsplash License](https://unsplash.com/license). Products and brand are invented; no purchases or payments occur.
