// Merchant journey metrics, shared by the local Node report and the hosted browser demo.
// Every figure is derived per session from recorded events; nothing is extrapolated.
const uxFriction = ['dead_click', 'rage_click', 'excessive_scroll'];

function sessionsOf(rows) {
  const sessions = new Map();
  for (const row of rows) {
    if (!sessions.has(row.sessionId)) sessions.set(row.sessionId, { source: row.source, types: new Set(), cartValue: null, orderValue: null, shortfall: 0 });
    const session = sessions.get(row.sessionId);
    session.types.add(row.eventType);
    const value = Number.isFinite(row.value) ? row.value : null;
    if (value === null) continue;
    if (['add_to_cart', 'checkout_review'].includes(row.eventType)) session.cartValue = value;
    if (row.eventType === 'order_placed') session.orderValue = session.cartValue = value;
    if (row.eventType === 'claim_mismatch') session.shortfall += value;
  }
  return [...sessions.values()];
}

function summarize(rows) {
  const list = sessionsOf(rows);
  const has = (session, ...types) => types.some(type => session.types.has(type));
  const rate = (part, whole) => whole ? part / whole : null;
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const round = value => Math.round(value * 100) / 100;
  const carted = list.filter(session => has(session, 'add_to_cart'));
  const reached = carted.filter(session => has(session, 'cart_open', 'checkout_review', 'order_placed'));
  // Only the real demo store can place orders; simulated shoppers stop at checkout review.
  const store = list.filter(session => session.source === 'observed_store');
  const storeCarted = store.filter(session => has(session, 'add_to_cart'));
  const ordered = store.filter(session => has(session, 'order_placed'));
  const orderValues = ordered.map(session => session.orderValue).filter(value => value !== null);
  const checked = list.filter(session => has(session, 'claim_match', 'claim_mismatch'));
  const broken = checked.filter(session => has(session, 'claim_mismatch'));
  return {
    sessions: list.length,
    storeSessions: store.length,
    funnel: { sessions: list.length, addedToCart: carted.length, reachedCart: reached.length, ordered: ordered.length },
    addToCartRate: rate(carted.length, list.length),
    cartAbandonmentRate: rate(storeCarted.filter(session => !has(session, 'order_placed')).length, storeCarted.length),
    conversionRate: rate(ordered.length, store.length),
    averageCartValue: mean(carted.map(session => session.cartValue).filter(value => value !== null)),
    averageOrderValue: mean(orderValues),
    revenue: round(orderValues.reduce((sum, value) => sum + value, 0)),
    promiseChecks: checked.length,
    promiseKeptRate: rate(checked.length - broken.length, checked.length),
    brokenPromiseSessions: broken.length,
    discountShortfall: round(broken.reduce((sum, session) => sum + session.shortfall, 0)),
    // Click and scroll friction is only recorded in real browser sessions.
    frictionSessionRate: rate(store.filter(session => has(session, ...uxFriction)).length, store.length),
    deadClicks: rows.filter(row => row.eventType === 'dead_click').length,
    rageClicks: rows.filter(row => row.eventType === 'rage_click').length,
    excessiveScrolls: rows.filter(row => row.eventType === 'excessive_scroll').length
  };
}

export function journeyMetrics(rows) {
  const products = new Map();
  for (const row of rows) {
    if (row.eventType !== 'add_to_cart' || !row.productId) continue;
    if (!products.has(row.productId)) products.set(row.productId, new Set());
    products.get(row.productId).add(row.sessionId);
  }
  return {
    all: summarize(rows),
    A: summarize(rows.filter(row => row.variant === 'A')),
    B: summarize(rows.filter(row => row.variant === 'B')),
    topProducts: [...products].map(([productId, sessions]) => ({ productId, sessions: sessions.size })).sort((a, b) => b.sessions - a.sessions)
  };
}
