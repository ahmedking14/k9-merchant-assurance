# K9

A Kane CLI Hack Day project: simulated shoppers challenge a specific storefront promise, and Kane can verify the real browser journey.

[Live merchant cockpit](https://k9-merchant-assurance.vercel.app/) · [Visual proof trail](https://k9-merchant-assurance.vercel.app/proof.html)

## Judging proof at a glance

| What to verify | Where the proof lives |
| --- | --- |
| A real journey found a bug, then passed after repair | [Failed Kane pack](evidence/1bcb3020-0c39-419f-b3e2-6bb898c78469.evidence) shows `-$0.00` and `$189.00`; the [passing pack](evidence/03c84a33-e069-4513-b782-e3a932e31db9.evidence) shows `-$37.80` and `$151.20` for the same generated challenger test. [Visual comparison](https://k9-merchant-assurance.vercel.app/proof.html). |
| The coding agent read Kane and changed course | The first generated test misread the cart; Kane generated reviewed replacement `t-4`. After Kane confirmed the product defect, the [repair commit](https://github.com/ahmedking14/k9-merchant-assurance/commit/20a7aeafdec80b454b0855614c1f995b4dab07b6) changed the challenger default, and the same test passed. The exact sequence is in [the assurance runbook](docs/assurance-demo.md). |
| Kane went beyond an ad hoc run | [Approved generated `_test.md` files](.testmuai/tests), committed replay recordings, [two-test suite receipt](reports/kane-suite.json), [validated suite pack](evidence/73ced7dc-3fe6-4d36-a7a6-6a1509a1ccba.evidence), [coverage receipt](reports/coverage.json), and [PR workflow](.github/workflows/kane-suite.yml). |
| A reviewer can run the project | `npm run dev` starts the local app with no install step. `npm run check` checks the product contract. An authenticated Kane CLI can run `npm run kane:ci` while the app is running. [Evidence manifest and hashes](evidence/README.md). |

The GitHub PR workflow is committed but cannot run successfully until `KANE_USERNAME` and `KANE_ACCESS_KEY` secrets are added. It becomes a merge gate only after **Kane cart suite** is required by a branch rule. The focused discount use case has 3 of 4 criteria proven; the wider six-use-case brief is not fully covered.

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
- Kane's generated challenger test passed after a confirmed red defect and repair. The control replay passed. Historical project coverage snapshot: 13.4%.
- Solo team. No event submission claimed yet.
- The local dev server runs on port 4173. The merchant report card reads captured Kane receipts separately from local simulation telemetry.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`. No dependencies need installing. Run `npm run check` for the store contract and telemetry range checks. The Kane action requires an authenticated `kane-cli` installation and uses the approved generated `t-4` file. To enable OpenAI triage, set `OPENAI_API_KEY` in your own terminal environment before starting the server; never commit it. The server uses the [OpenAI Responses API structured output format](https://developers.openai.com/api/docs/guides/structured-outputs).

The first visit opens a guided demo. **Guided demo** in the header reopens it later. Each step activates the actual local workflow: introduce the challenger fault, compare five shoppers, inspect Kane evidence, apply the demo repair, compare again, and check the repair. Use **Right/Down Arrow** to continue and **Left/Up Arrow** to revisit a step. The keyboard path uses saved historical receipts at Kane steps; only clicking **Run Kane live** starts a new credit-using browser run. The guide never presents a saved receipt as a fresh verification of the current store state. On desktop the translucent guide has its own side rail, so it does not cover the dashboard.

## Kane verification path

1. **Drive a plain-language objective.** `kane-cli run 'Open the challenger B storefront, add Halo Wireless Headphones to the bag, and before placing any order verify that the displayed FIRST20 discount is negative 37 dollars and 80 cents and the displayed cart total is 151 dollars and 20 cents. Do not place an order.' --agent --url 'https://k9-merchant-assurance.vercel.app/store.html?variant=B'` passed on the hosted storefront. [Open its Kane report](https://test-manager.lambdatest.com/projects/01M5R1TGJ1NWR7HB9ADNGCGMAA/test-cases/01M5R7JC9RM0KG63ZB8AKTBZWC/dashboard/share/US_YR2NYHHOJZA0JMIVNIHHA3HW0VB08EUP0TEZVWM9IZEVXU836FYMXIYC4B9OP8VH?type=summary&agentView=true&fqdn=summary-page). The page showed `-$37.80` and `$151.20`; this objective run's internal number comparison dropped cents, so the saved cart suite below is the merge gate.
2. **Replay the saved suite.** Start `npm run dev`, then run `npm run kane:ci`. The script selects the two approved Kane-generated cart tests, checks Kane's NDJSON completion and both member results, then validates the sealed evidence pack. It fails with a nonzero exit on a failed test, incomplete stream, missing evidence ingest, or invalid pack. The GitHub pull request workflow runs the same command headlessly.
3. **Keep the proof.** The latest local suite receipt is [`reports/kane-suite.json`](reports/kane-suite.json). Local `reports/kane-suite.ndjson` and `.testmuai/evidence/*.evidence` stay uncommitted. Each CI run uploads those logs, the receipt, and the sealed pack as a private 14-day Actions artifact. The two Kane-generated `_test.md` files and their replay recordings are committed so CI can replay the saved journey.

For CI, add repository secrets `KANE_USERNAME` and `KANE_ACCESS_KEY`, then require the **Kane cart suite** status check in the branch protection rule. The workflow fails clearly when either secret is missing. Kane browser runs spend credits.

## Hosted demo

`vercel.json` builds a static deployment with a browser-local scenario and telemetry store. The Vercel site supports the A/B comparison, storefront, guided walkthrough, time-range report, and clearly marked archived Kane receipts. The separate proof page shows screenshots from the failed and passing packs. Full packs are committed in the public repository and include Kane account metadata; the hosted site serves only the proof screenshots. Fresh Kane CLI runs, new evidence packs, and OpenAI triage require the local Node app and its configured credentials; the hosted site disables those actions rather than claiming a fresh verification.

The storefront and control room use real stock photographs from Unsplash as fictional demo imagery under the [Unsplash License](https://unsplash.com/license). Products and brand are invented; no purchases or payments occur.
