# Demo and submission runbook

## The live sequence

1. Open the control room and show the campaign promise.
2. Run the five-shopper A/B comparison. Explain that this is a local simulation; if an OpenAI key is configured, OpenAI plans the five archetypes' intents.
3. Open MONOFORM control A and add Halo headphones. The first-order discount is visible in the cart.
4. Open challenger B and repeat the same journey. The cart shows that the FIRST20 offer was not applied.
5. Run Kane CLI against the browser journey and show its real failure report.
6. Have the coding agent change the faulty rule, rerun Kane, and show the passing report plus the code diff.

Do not call local simulator output Kane evidence. The real Kane run and sealed pack must exist before claiming the judging gate is met.

## Proof to collect

- A public repository containing today's code, README, runnable command, requirements, and the exact final commit SHA.
- A live URL or a run command that works on a fresh machine.
- Failed and passing Kane run links; attach the required evidence pack through the event submission flow. Keep raw evidence packs private because they may include network logs or secrets.
- A short explanation of the OpenAI component and the exact point where Kane caused the agent to change code.
- Known limitations, including that 25- and 100-shopper cohorts expand five archetype plans deterministically and that the storefront uses fictional products.

## GTM points

The public rubric allocates 25 points to launch links: 7 for a 2–4 minute voiced demo, 4 for a deck, 4 for a blog post, 3 for LinkedIn, 3 for X, 2 for Show HN, and 2 for outside-team engagement. Each asset must be live and linked in the submission to count. The demo video should begin with the Kane report and show one real browser flow, the failure, and the fix.

The separate shipped-prize bundle requires the repo, live URL or run command, and Kane report, plus any two of video, blog, X, or Show HN. The signed-in participant must save those links in the Submit tab before finalizing. Check the site's preflight before final submission.

Public posting and final submission stay with the participant. Drafts should be made from actual Kane run details so they never claim a result that did not happen.
