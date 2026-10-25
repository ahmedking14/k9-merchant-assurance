import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

class Store {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}
const archived = JSON.parse(await readFile(new URL('../dist/hosted/status.json', import.meta.url), 'utf8'));
globalThis.localStorage = new Store();
globalThis.location = new URL('https://k9-demo.vercel.app/');
globalThis.window = { fetch: async () => new Response(JSON.stringify(archived), { status: 200 }) };
await import('../app/hosted-api.js');
const api = (path, init) => window.fetch(path, init).then(async result => ({ status: result.status, body: await result.json() }));

assert.equal(window.K9_HOSTED_DEMO, true);
assert.equal((await api('/api/scenario')).body.discountBreak, false);
await api('/api/scenario', { method: 'POST', body: JSON.stringify({ discountBreak: true }) });
assert.equal((await api('/api/scenario')).body.discountBreak, true);
const status = (await api('/api/assurance/status')).body;
assert.equal(status.hosted, true);
assert.equal(status.run, null);
assert.equal(status.redRun.confirmedProductBugs.length > 0, true);
assert.equal(status.greenRun.status, 'passed');
assert.equal((await api('/api/assurance/run', { method: 'POST' })).status, 501);

const now = new Date().toISOString();
const sample = { sessionId: 'sample-session-123', source: 'simulated', variant: 'B', personaId: 'Deal Hunter', productId: 'headphones', eventType: 'claim_mismatch', element: '#cartFooter', pageUrl: '/store.html?variant=B', detail: 'Discount missing', timestamp: now, step: 1 };
assert.equal((await api('/api/telemetry/events', { method: 'POST', body: JSON.stringify({ events: [sample] }) })).body.accepted, 1);
const range = new URLSearchParams({ startTime: new Date(Date.now() - 60_000).toISOString(), endTime: new Date(Date.now() + 60_000).toISOString(), bucketMinutes: '5' });
const report = (await api('/api/reports/friction?' + range)).body;
assert.equal(report.totalSessions, 1);
assert.equal(report.counts.claim_mismatch, 1);
assert.equal((await api('/api/reports/session?sessionId=sample-session-123')).body.events.length, 1);
console.log('Hosted demo scenario, archived Kane proof, local telemetry, and disabled live run verified.');
