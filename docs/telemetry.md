# K9 telemetry and time range reports

K9 keeps two sources distinct:

- **Simulated**: modelled shopper steps derived from the local A/B evaluator. These record claim views, product choice, cart review, and claim matches or mismatches. They are not browser actions.
- **Observed store**: interactions captured by the demo storefront. It records page views, clicks, cart actions, demo orders, and heuristic friction signals. A dead click is a button click with no detected DOM, URL, or scroll change after 700 ms. A rage click is three clicks on the same target within 900 ms. Excessive scroll is more than 1,800 pixels of travel within five seconds. These heuristics are leads for review, not proof of a product defect.

Every event has a session ID, source, variant, element selector, page URL, event type, ISO timestamp with milliseconds, and step index. The local server appends events to `data/telemetry.jsonl`. This file is ignored by Git. The server reads the latest 5,000 events for reports. It does not collect personal data or send telemetry to a third party.

## API

- `POST /api/telemetry/events` accepts `{ "events": [...] }` (1–2,000 validated events).
- `GET /api/reports/friction?startTime=<ISO>&endTime=<ISO>&source=all|simulated|observed_store&bucketMinutes=1|5|15|60` returns exact-bound time range counts, chronological buckets, hotspots, and sessions. The maximum query span is 30 days.
- `GET /api/reports/session?sessionId=<id>` returns the ordered event timeline for a session.

The current store is a local JSONL event log because K9 runs without external services or dependencies. For a production multi-user deployment, move event append and range aggregation to a database with indexes on `(timestamp, source)` and `(session_id, timestamp)`, and enforce retention and authorization per brand. Query parameters should remain validated and parameterized.

## Kane CLI

The Evidence room can read Kane CLI `events.ndjson` in the browser and summarize completed or failed steps and the terminal result. The imported log is not uploaded or saved in K9's telemetry store. The sealed Kane evidence pack remains the authoritative source for screenshots and detailed browser proof. Kane sign-in and a real run are still required to produce that evidence.
