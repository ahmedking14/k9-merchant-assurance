import { journeyMetrics } from './journey-metrics.js';

const originalFetch = window.fetch.bind(window);
const scenarioKey = 'k9-hosted-scenario-v1';
const telemetryKey = 'k9-hosted-telemetry-v1';
const frictionTypes = new Set(['claim_mismatch', 'dead_click', 'rage_click', 'excessive_scroll']);
window.K9_HOSTED_DEMO = true;

const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});
const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const scenario = () => {
  const value = read(scenarioKey, null);
  return typeof value?.discountBreak === 'boolean' ? value : { discountBreak: false, updatedAt: null };
};
const events = () => read(telemetryKey, []);
const snapshot = originalFetch('/hosted/status.json').then(result => {
  if (!result.ok) throw new Error('Archived Kane status is unavailable');
  return result.json();
});

function report(url) {
  const endTime = url.searchParams.get('endTime') || new Date().toISOString();
  const startTime = url.searchParams.get('startTime') || new Date(Date.parse(endTime) - 86400_000).toISOString();
  const source = url.searchParams.get('source') || 'all';
  const bucketMinutes = Number(url.searchParams.get('bucketMinutes') || 5);
  if (!Number.isFinite(Date.parse(startTime)) || !Number.isFinite(Date.parse(endTime)) || Date.parse(startTime) > Date.parse(endTime) || Date.parse(endTime) - Date.parse(startTime) > 30 * 86400_000 || ![1, 5, 15, 60].includes(bucketMinutes) || !['all', 'simulated', 'observed_store'].includes(source)) return { error: 'Invalid time range or filter' };
  const rows = events().filter(row => row.timestamp >= startTime && row.timestamp <= endTime && (source === 'all' || row.source === source)).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.step - b.step);
  const meaningful = new Map();
  for (const row of rows) if (['add_to_cart', 'cart_open', 'order_placed'].includes(row.eventType)) {
    if (!meaningful.has(row.sessionId)) meaningful.set(row.sessionId, []);
    meaningful.get(row.sessionId).push(Date.parse(row.timestamp));
  }
  const filtered = rows.filter(row => row.eventType !== 'dead_click' || !(meaningful.get(row.sessionId) || []).some(time => Math.abs(time - Date.parse(row.timestamp)) <= 1500));
  const counts = {}, buckets = new Map(), sessions = new Map(), hotspots = new Map();
  for (const row of filtered) {
    counts[row.eventType] = (counts[row.eventType] || 0) + 1;
    if (!sessions.has(row.sessionId)) sessions.set(row.sessionId, { sessionId: row.sessionId, source: row.source, variant: row.variant, personaId: row.personaId, productId: row.productId, startTime: row.timestamp, endTime: row.timestamp, eventCount: 0, frictionCount: 0 });
    const session = sessions.get(row.sessionId);
    session.endTime = row.timestamp; session.eventCount++;
    const friction = frictionTypes.has(row.eventType);
    if (friction) session.frictionCount++;
    const width = bucketMinutes * 60_000;
    const start = new Date(Math.floor(Date.parse(row.timestamp) / width) * width).toISOString();
    if (!buckets.has(start)) buckets.set(start, { startTime: start, events: 0, friction: 0, deadClicks: 0, rageClicks: 0, excessiveScrolls: 0, claimMismatches: 0 });
    const bucket = buckets.get(start);
    bucket.events++;
    if (friction) {
      bucket.friction++;
      bucket[{ dead_click: 'deadClicks', rage_click: 'rageClicks', excessive_scroll: 'excessiveScrolls', claim_mismatch: 'claimMismatches' }[row.eventType]]++;
      const key = [row.pageUrl, row.element, row.eventType].join('|');
      if (!hotspots.has(key)) hotspots.set(key, { pageUrl: row.pageUrl, element: row.element, eventType: row.eventType, count: 0, firstSeen: row.timestamp, lastSeen: row.timestamp });
      const hot = hotspots.get(key); hot.count++; hot.lastSeen = row.timestamp;
    }
  }
  return { startTime, endTime, source, bucketMinutes, totalEvents: filtered.length, totalSessions: sessions.size, counts, metrics: journeyMetrics(filtered),
    buckets: [...buckets.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    hotspots: [...hotspots.values()].sort((a, b) => b.count - a.count).slice(0, 20),
    sessions: [...sessions.values()].sort((a, b) => b.startTime.localeCompare(a.startTime) || b.frictionCount - a.frictionCount).slice(0, 100) };
}

window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return originalFetch(input, init);
  const method = (init.method || (typeof input === 'string' ? 'GET' : input.method) || 'GET').toUpperCase();
  if (url.pathname === '/api/status') return response({ openaiReady: false, model: null, hosted: true });
  if (url.pathname === '/api/scenario') {
    if (method === 'GET') return response(scenario());
    const body = JSON.parse(init.body || '{}');
    if (typeof body.discountBreak !== 'boolean') return response({ error: 'Invalid scenario' }, 400);
    const current = scenario();
    const next = current.discountBreak === body.discountBreak ? current : { discountBreak: body.discountBreak, updatedAt: new Date().toISOString() };
    localStorage.setItem(scenarioKey, JSON.stringify(next));
    return response(next);
  }
  if (url.pathname === '/api/telemetry/events' && method === 'POST') {
    const rows = JSON.parse(init.body || '{}').events;
    if (!Array.isArray(rows) || rows.length > 2000) return response({ error: 'Invalid events' }, 400);
    const current = events();
    const next = [...current, ...rows.filter(row => row && typeof row.sessionId === 'string' && typeof row.timestamp === 'string' && typeof row.eventType === 'string')].slice(-1800);
    try { localStorage.setItem(telemetryKey, JSON.stringify(next)); }
    catch { localStorage.setItem(telemetryKey, JSON.stringify(next.slice(-600))); }
    return response({ accepted: rows.length }, 201);
  }
  if (url.pathname === '/api/reports/friction' && method === 'GET') {
    const result = report(url);
    return response(result, result.error ? 400 : 200);
  }
  if (url.pathname === '/api/reports/session' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    return response({ events: events().filter(row => row.sessionId === sessionId).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.step - b.step) });
  }
  if (url.pathname === '/api/assurance/status' && method === 'GET') return response({ ...await snapshot, scenario: scenario(), verificationCurrent: false, hosted: true });
  if (url.pathname === '/api/assurance/run') return response({ error: 'Fresh Kane browser runs require the local app and Chrome. This hosted demo shows archived evidence.' }, 501);
  if (url.pathname === '/api/assurance/triage' && method === 'POST') {
    const body = JSON.parse(init.body || '{}');
    const params = new URLSearchParams({ startTime: body.startTime, endTime: body.endTime, source: 'all', bucketMinutes: '5' });
    const result = report(new URL('/api/reports/friction?' + params, location.href));
    if (result.error) return response(result, 400);
    const mismatches = result.counts.claim_mismatch || 0;
    const issue = scenario().discountBreak || mismatches ? { priority: 'P1', title: 'Review the discount in challenger B', finding: `${mismatches} local claim mismatch event(s) in the selected window. Archived Kane evidence confirms a prior defect; it does not verify this current browser state.`, proposedFix: 'Apply the demo repair, compare again, then run Kane locally for a fresh browser receipt.', evidence: 'Local simulation and archived Kane red receipt' } : { priority: 'P2', title: 'Keep the first-order cart test', finding: 'No local discount mismatch is recorded in this window.', proposedFix: 'Use the generated cart test as a regression check in the local Kane workflow.', evidence: 'Archived Kane green receipt' };
    return response({ agent: 'K9 Triage Agent', mode: 'rule-based preview', issues: [issue], run: null, coverage: (await snapshot).coverage });
  }
  if (url.pathname === '/api/plan') return response({ error: 'OpenAI planning is available in the local app when configured.' }, 503);
  return response({ error: 'Unavailable in the hosted demo' }, 404);
};
