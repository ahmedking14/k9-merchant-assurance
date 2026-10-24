import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const eventTypes = new Set([
  'session_start', 'claim_view', 'product_view', 'add_to_cart', 'checkout_review',
  'claim_match', 'claim_mismatch', 'page_view', 'click', 'dead_click',
  'rage_click', 'excessive_scroll', 'cart_open', 'order_placed'
]);
const sources = new Set(['simulated', 'observed_store']);
const maxRows = 5000;

function validTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}
function clean(value, max = 180) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
function normalizeEvent(input) {
  if (!input || typeof input !== 'object' || !validTime(input.timestamp) || !eventTypes.has(input.eventType) ||
      !sources.has(input.source) || !/^[\w-]{8,80}$/.test(input.sessionId || '')) throw new Error('Invalid telemetry event');
  return {
    sessionId: input.sessionId,
    source: input.source,
    variant: input.variant === 'B' ? 'B' : 'A',
    personaId: clean(input.personaId, 40),
    productId: clean(input.productId, 40),
    eventType: input.eventType,
    element: clean(input.element, 160),
    pageUrl: clean(input.pageUrl, 300),
    detail: clean(input.detail, 300),
    timestamp: input.timestamp,
    step: Number.isInteger(input.step) && input.step >= 0 ? input.step : 0
  };
}
function bucketStart(timestamp, bucketMinutes) {
  const width = bucketMinutes * 60_000;
  return new Date(Math.floor(Date.parse(timestamp) / width) * width).toISOString();
}
function compareEvents(a, b) {
  return a.timestamp.localeCompare(b.timestamp) || a.step - b.step;
}

export function createTelemetryStore(file) {
  let pending = Promise.resolve();
  async function append(events) {
    if (!Array.isArray(events) || events.length < 1 || events.length > 2000) throw new Error('Expected 1–2000 events');
    const rows = events.map(normalizeEvent);
    pending = pending.then(async () => {
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
    });
    await pending;
    return { accepted: rows.length };
  }
  async function all() {
    await pending;
    let contents;
    try { contents = await readFile(file, 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    return contents.split('\n').filter(Boolean).slice(-maxRows).flatMap(line => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  }
  async function reportable() {
    const rows = await all();
    const meaningful = new Map();
    for (const row of rows) {
      if (!['add_to_cart', 'cart_open', 'order_placed'].includes(row.eventType)) continue;
      if (!meaningful.has(row.sessionId)) meaningful.set(row.sessionId, []);
      meaningful.get(row.sessionId).push(Date.parse(row.timestamp));
    }
    return rows.filter(row => row.eventType !== 'dead_click' ||
      !(meaningful.get(row.sessionId) || []).some(time => Math.abs(time - Date.parse(row.timestamp)) <= 1500));
  }
  async function report({ startTime, endTime, source = 'all', bucketMinutes = 5 }) {
    if (!validTime(startTime) || !validTime(endTime) || Date.parse(startTime) > Date.parse(endTime)) throw new Error('Invalid time range');
    if (Date.parse(endTime) - Date.parse(startTime) > 30 * 86400_000) throw new Error('Range cannot exceed 30 days');
    if (!['all', ...sources].includes(source)) throw new Error('Invalid source');
    if (![1, 5, 15, 60].includes(bucketMinutes)) throw new Error('Invalid bucket size');
    const rows = (await reportable()).filter(row => row.timestamp >= startTime && row.timestamp <= endTime && (source === 'all' || row.source === source)).sort(compareEvents);
    const counts = Object.fromEntries([...eventTypes].map(type => [type, 0]));
    const sessions = new Map(), buckets = new Map(), hotspots = new Map();
    for (const row of rows) {
      counts[row.eventType] = (counts[row.eventType] || 0) + 1;
      if (!sessions.has(row.sessionId)) sessions.set(row.sessionId, { sessionId: row.sessionId, source: row.source, variant: row.variant, personaId: row.personaId, productId: row.productId, startTime: row.timestamp, endTime: row.timestamp, eventCount: 0, frictionCount: 0 });
      const session = sessions.get(row.sessionId);
      session.endTime = row.timestamp; session.eventCount++;
      const friction = ['claim_mismatch', 'dead_click', 'rage_click', 'excessive_scroll'].includes(row.eventType);
      if (friction) session.frictionCount++;
      const key = bucketStart(row.timestamp, bucketMinutes);
      if (!buckets.has(key)) buckets.set(key, { startTime: key, events: 0, friction: 0, deadClicks: 0, rageClicks: 0, excessiveScrolls: 0, claimMismatches: 0 });
      const bucket = buckets.get(key); bucket.events++;
      if (friction) {
        bucket.friction++;
        const prop = { dead_click: 'deadClicks', rage_click: 'rageClicks', excessive_scroll: 'excessiveScrolls', claim_mismatch: 'claimMismatches' }[row.eventType];
        bucket[prop]++;
        const hotKey = [row.pageUrl, row.element, row.eventType].join('|');
        if (!hotspots.has(hotKey)) hotspots.set(hotKey, { pageUrl: row.pageUrl, element: row.element, eventType: row.eventType, count: 0, firstSeen: row.timestamp, lastSeen: row.timestamp });
        const hot = hotspots.get(hotKey); hot.count++; hot.lastSeen = row.timestamp;
      }
    }
    return {
      startTime, endTime, source, bucketMinutes, totalEvents: rows.length, totalSessions: sessions.size,
      counts, buckets: [...buckets.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      hotspots: [...hotspots.values()].sort((a, b) => b.count - a.count).slice(0, 20),
      sessions: [...sessions.values()].sort((a, b) => b.startTime.localeCompare(a.startTime) || b.frictionCount - a.frictionCount).slice(0, 100)
    };
  }
  async function session(sessionId) {
    if (!/^[\w-]{8,80}$/.test(sessionId || '')) throw new Error('Invalid session ID');
    return (await reportable()).filter(row => row.sessionId === sessionId).sort(compareEvents);
  }
  return { append, report, session };
}
