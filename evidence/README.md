# Kane evidence packs

These three original, sealed Kane CLI packs were copied from the runs after checking their text entries for credentials. They are committed with the generated tests and receipts so the proof survives a fresh clone. Each pack passed `kane-cli evidence validate <path> --json`.

These original packs include Kane account metadata, including an email address. They are committed as public, unmodified proof; review that metadata before redistributing the files.

| Run | Outcome | Pack | SHA-256 |
| --- | --- | --- | --- |
| Challenger before repair | Confirmed product defect; cart showed `-$0.00` discount and `$189.00` total | [`1bcb3020-0c39-419f-b3e2-6bb898c78469.evidence`](1bcb3020-0c39-419f-b3e2-6bb898c78469.evidence) | `56ab09600307fbc567cae094473afcecc3f58a3c5cb146943acefa956556d8ab` |
| Same challenger test after repair | Passed; `-$37.80` discount and `$151.20` total | [`03c84a33-e069-4513-b782-e3a932e31db9.evidence`](03c84a33-e069-4513-b782-e3a932e31db9.evidence) | `ea7b205869e07df39c84a21df9fed3357658fb66990a33072fa9236b36726d6b` |
| Saved two-test suite replay | Challenger and control both passed; one pack | [`73ced7dc-3fe6-4d36-a7a6-6a1509a1ccba.evidence`](73ced7dc-3fe6-4d36-a7a6-6a1509a1ccba.evidence) | `fcbeae56b2a531cc7d53bc35d4cd1b7a8a49e46b0b25c3cfca020cad3115a866` |

The failed pack passes Kane's integrity validation with two nonfatal step-metadata warnings. Its run manifest reports one failed test, the failure record names the missing first-order discount, and the cart screenshot shows the `$189.00` total. The warnings are preserved in the original pack rather than edited away.

The source screenshots in [`app/proof-assets`](../app/proof-assets) came directly from each pack's cart step. The [proof page](../app/proof.html) presents them with links to the full packs. Future packs stay ignored until reviewed, since network logs may contain sensitive data.
