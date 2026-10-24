# Hack Day plan

## Judging target

The event has three tracks: Web App, Mobile App, and Other. This project fits Web App, with a possible Other framing if the harness itself becomes the product. Every track uses the same four 25-point areas: Kane CLI usage, idea uniqueness, completion, and GTM.

Eligibility gates: code written today in a public repo, OpenAI used in the build, and a Kane CLI evidence pack attached to the submission.

## Demo sequence

1. Show the source ad or landing-page claim and five shopper archetypes based on it.
2. Show one shopper taking the main journey to a result.
3. Have Kane verify the specific promise in the browser with an assertion.
4. Show the failed evidence pack, including the step that contradicted the promise.
5. Have the coding agent use the result to repair the app.
6. Rerun Kane and show the green evidence plus the code change.

The swarm is useful only if its goals lead to distinct, observable customer outcomes. Keep the first version to one broken promise and one main journey. The product's wedge is claim-to-outcome verification with an agent repair loop; generic synthetic shopper testing is already a shipped category.

## Build order

- Choose the store target and one failure scenario.
- Build or connect the smallest electronics storefront flow: landing page, product, cart, result.
- Add five shopper personas with explicit goals and a visible run timeline.
- Use OpenAI for shopper decisions or for the builder agent's repair loop; document the exact use.
- Write a short requirements brief and use Kane CLI's supported assurance workflow to generate runnable tests. Do not hand-write Kane test cases.
- Run Kane against the real browser flow, inspect evidence, fix, and rerun.
- Publish a runnable public repo with README, run command, test definitions, and evidence.
- Capture a 2–4 minute voiced demo beginning with the Kane report; prepare deck, blog, LinkedIn, X, and Show HN links for GTM points.

## Required submission evidence

- Project name and type; one-line pitch.
- Public repository and exact commit SHA.
- Live URL or run command.
- Linked Kane run report/evidence pack.
- Harness description, Kane components used, and known limitations.
- Linked launch assets for GTM and the separate shipped-prize checklist, if pursued.

The event's submission preflight is authoritative for finalization. Do not treat this checklist as proof that the account or team has submitted.

## Pending decisions

- Demo storefront or an existing owned store?
- Which promise fails in the first run?
- Solo or team, and does a public repo/team page exist?
