# K9

A Kane CLI Hack Day project: simulated shoppers challenge a specific storefront promise, and Kane can verify the real browser journey.

## One-sentence pitch

Five shopper archetypes pursue goals rooted in a store claim. The app compares control and challenger journeys, and Kane independently verifies the real browser cart. A confirmed challenger discount defect was repaired and the same generated Kane test passed on rerun.

## Product objective

K9 finds the gap between a commerce promise and the outcome a shopper actually receives. The core loop is: define a claim, compare the same shopper goals against control and challenger storefronts, then verify the real browser journey with Kane CLI. Local simulations are directional and are never presented as Kane evidence.

## Current scope

MONOFORM is a fictional design-led electronics store with four shoppable products, a cart, and a demo order result. The single-screen merchant cockpit follows one decision: **Does the advertised first-order discount survive the cart?** Its visual path is claim → simulate → Kane CLI → decision. The controls, live Kane stage, report card, and next action remain visible together on a desktop screen. Step 1 compares 5, 25, or 100 local shopper journeys across control A and challenger B. Step 2 runs Kane's already reviewed browser test against the same local store state and shows the real CLI step activity. Step 3 shows the exact Kane-observed discount and total, evidence-pack IDs, a pack download, coverage, and a contextual next action. The simulation is directional; only Kane's browser run is presented as verification.

The discount fault switch is stored by the local server, so the dashboard, demo store, and separate Kane Chrome session use the same scenario. Changing it marks the saved Kane receipt as stale. The merchant can run the reviewed challenger test from the page; it consumes Kane credits. Time-range telemetry, friction spikes, and individual sessions sit in the optional journey-data section. A separate K9 Triage Agent ranks proposed fixes from Kane and telemetry; it uses the OpenAI Responses API when `OPENAI_API_KEY` is configured and clearly labels the deterministic fallback otherwise. The exact Kane commands and review gates are in [docs/assurance-demo.md](docs/assurance-demo.md).

See [docs/hackday-plan.md](docs/hackday-plan.md) for the build sequence and judging checklist.

## Status

- Web app and store implemented; local contract check passes with `npm run check`.
- Kane's generated challenger test passed after a confirmed red defect and repair. The control replay passed. Project coverage is 13.4% (3 of 4 designed criteria proven); the returning-shopper criterion is deferred.
- Solo team. No public repo or event submission claimed yet.
- The local dev server runs on port 4173. The merchant report card reads captured Kane receipts separately from local simulation telemetry.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`. No dependencies need installing. Run `npm run check` for the store contract and telemetry range checks. The Kane action requires an authenticated `kane-cli` installation and uses the approved generated `t-4` file. To enable OpenAI triage, set `OPENAI_API_KEY` in your own terminal environment before starting the server; never commit it. The server uses the [OpenAI Responses API structured output format](https://developers.openai.com/api/docs/guides/structured-outputs).

The first visit opens a guided demo. **Guided demo** in the header reopens it later. Each step activates the actual local workflow: introduce the challenger fault, compare five shoppers, inspect Kane evidence, apply the demo repair, compare again, and check the repair. Use **Right/Down Arrow** to continue and **Left/Up Arrow** to revisit a step. The keyboard path uses saved historical receipts at Kane steps; only clicking **Run Kane live** starts a new credit-using browser run. The guide never presents a saved receipt as a fresh verification of the current store state. On desktop the translucent guide has its own side rail, so it does not cover the dashboard.

The storefront and control room use real stock photographs from Unsplash as fictional demo imagery under the [Unsplash License](https://unsplash.com/license). Products and brand are invented; no purchases or payments occur.
