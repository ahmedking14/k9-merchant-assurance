# K9 requirements

The product is a web app. It uses a realistic demo electronics store with real product photographs and a believable fictional brand.

The platform has a navigation bar and can run simulated shopper swarms with different shopper archetypes. It compares A/B variants and tests different failures. The first core failure is a discount promised on the store page that breaks in the cart. Additional configurable cases include shipping, stock, dynamic pricing, marketing copy changes, coupon eligibility, and return-policy wording.

The demo must show a shopper completing a real store journey, a Kane CLI browser run that catches the broken discount or proves the repaired journey, and a coding agent changing the app based on Kane's result and rerunning Kane. The participant is solo. OpenAI is used in the build and, when configured, to plan distinct shopper intents in the app.

The app must identify local simulation results separately from Kane CLI evidence. It must not present simulated outcomes as Kane runs.
