# K9 requirements

The product is a web app. It uses a realistic demo electronics store with real product photographs and a believable fictional brand.

The platform has a navigation bar and can run simulated shopper swarms with different shopper archetypes. It compares A/B variants and tests different failures. The first core failure is a discount promised on the store page that breaks in the cart. Additional configurable cases include shipping, stock, dynamic pricing, marketing copy changes, coupon eligibility, and return-policy wording.

The demo must show a shopper completing a real store journey, a Kane CLI browser run that catches the broken discount or proves the repaired journey, and a coding agent changing the app based on Kane's result and rerunning Kane. The participant is solo. OpenAI is used in the build and, when configured, to plan distinct shopper intents in the app.

The app must identify local simulation results separately from Kane CLI evidence. It must not present simulated outcomes as Kane runs.

## Focused hack-day browser journey

The demo storefront is served locally at `http://localhost:4173/store.html`. Its campaign promises **20% off a first order**, applied automatically in the cart with no code-entry step. The control storefront is at `?variant=A`; the deliberately broken challenger is at `?variant=B`.

A shopper can open the challenger storefront, see the first-order offer, add the Halo Wireless Headphones to the cart, and inspect the cart before placing a demo order. The cart must show the promised 20% discount and the correct total for an eligible first order. The current challenger intentionally drops that discount, so the first Kane run should expose the contradiction as a failed assertion. The control storefront should honor the discount.

After the defect is repaired, the same generated browser test should pass on the challenger. The frontend report must distinguish local simulation findings from Kane's generated test, browser assertion, evidence pack, and coverage figure. The K9 Triage Agent may prioritize a proposed fix from these inputs but must not claim an unexecuted repair.
