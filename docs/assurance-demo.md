# K9 assurance demo

The single judged loop is the advertised **20% first-order discount** on the MONOFORM demo store. Variant A honored it while variant B dropped it in the cart. Kane confirmed the defect, then the discount was repaired and the same generated browser test passed. Start the app with `npm run dev` and open the merchant cockpit. Its visual architecture is **claim → simulate shopper journeys → verify the current cart with Kane → act on the report card**. Controls, live test stages, result metrics, and next actions fit in one desktop view. The `discountBreak` switch updates the local server scenario shared by the dashboard, storefront, and Kane's separate Chrome session. Changing the scenario makes an older Kane receipt visibly stale.

## Kane command path

Run these from the repository root after `kane-cli login --oauth`. Kane's extract and design calls consume credits; browser test authoring can also consume credits. Keep the app on `http://localhost:4173` while the browser test runs.

```bash
kane-cli context ingest requirements/brief.md --mode agent
```

Inspect the proposed use case. The Kane CLI workflow requires a human review decision before design. Use the review command and item references printed in Kane's `next` output; do not guess IDs or bypass review.

```bash
kane-cli design tests --use-case <reviewed-use-case-ref> --mode agent --max 8
```

Review the generated acceptance criteria and `_test.md` files. After approval, run the generated file or files (do not hand-write a Kane test):

Kane's first design produced these files:

- `challenger-cart-exposes-missing-first-order-discount_test.md` — superseded after its first run misread the cart.
- `challenger-cart-exposes-missing-first-order-discount-2_test.md` — approved replacement `t-4`; reads the actual discount line and total before any order.
- `control-cart-honors-first-order-discount_test.md` — the honoring control check.
- `returning-shopper-receives-no-first-order-discount-in-either_test.md` — a later eligibility check. Kane recorded a **returning shopper fixture** gap because the demo store does not yet track shopper order history. Keep this out of the focused browser run until that behavior exists and its design is reviewed.

```bash
kane-cli testrun run .testmuai/tests/challenger-cart-exposes-missing-first-order-discount-2_test.md --no-adaptive-heal --author --agent < /dev/null | tee reports/kane-run-green.ndjson
node scripts/capture-assurance.mjs run reports/kane-run-green.ndjson
kane-cli cover --mode agent | tee reports/coverage.ndjson
node scripts/capture-assurance.mjs coverage reports/coverage.ndjson
```

The `reports/*.ndjson` streams and sealed evidence packs stay local. The capture script writes small, shareable receipts in `reports/kane-run-red.json`, `reports/kane-run-green.json`, and `reports/coverage.json`. Commit the generated `_test.md` files and these JSON outputs after inspecting them; keep `.context/` out of Git. The merchant report card reads these artifacts on refresh. Its **Run Kane** button runs the already approved t-4 test, shows live Chrome actions from Kane's session log, captures `reports/kane-run.json`, updates coverage, and shows the exact cart values Kane observed. The latest sealed pack can be downloaded from the report card. That button uses Kane credits; the page says so before it is pressed.

### Initial run diagnosis

The first two-test suite finished with a passing control and a failing challenger, but the challenger failure was **an automation mistake**: Kane clicked **Place demo order** before reading the cart total. Its screenshot showed `FIRST20 discount (not applied) -$0.00` and `$189.00` total, while its prior assertion calculated the expected `$37.80` from the ad and shelf price. That receipt remains in `reports/kane-run-initial.json` and is not product proof.

Kane `maintain evolve t-1` generated replacement `t-4`. The first replacement run found confusing campaign copy, “USE CODE FIRST20,” despite there being no code-entry field. The copy was clarified to say the first-order discount is automatically applied. The next `t-4` run confirmed a **product defect** with 98% confidence: variant B's cart showed no discount and retained the full price. Its agent stopped before a separate numerical assertion event, so `reports/kane-run-red.json` records a confirmed product bug and zero failed assertion events. Evidence pack: `1bcb3020-0c39-419f-b3e2-6bb898c78469`.

The repair changed the challenger default to apply the 20% offer, leaving the fault available as an explicit simulator toggle. The same `t-4` test then passed with a `$189.00` subtotal, `-$37.80` discount, and `$151.20` total before any order. Evidence pack: `03c84a33-e069-4513-b782-e3a932e31db9`. Project coverage is **13.4%**, with 3 of 4 designed criteria proven. The returning-shopper criterion remains unrun because the demo has no shopper-history fixture. This coverage is a project-wide figure, not a claim that all six use cases were tested.

The approved control test `t-2` was replayed after the copy change and also passed. Its receipt is `reports/kane-run-control.json`; evidence pack: `618bc796-3aa8-4570-b48d-25f2d615c476`.

## Agent handoff

Open **K9 Triage Agent** from the merchant report card. With `OPENAI_API_KEY` configured, the server sends the selected friction summary and captured Kane assertion failures to the OpenAI Responses API. The agent ranks issues and proposes fixes. Without a key, the UI labels its deterministic ranking **rule-based preview**. It never calls a proposed fix a completed repair. Open **Explore the journey data** for time ranges and individual sessions.

The generated test and paired receipts form the browser proof. The time-range report also shows variant IDs and session timestamps, so representative shopper journeys can be inspected without spending Kane credits on every simulated user. The proposed k6/Locust hybrid commands from later feedback are not part of this implementation; there is no load-tested checkout API or measured 500-user run to claim.
