const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const prettyTime = value => new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'});
const eventName = value => value.replaceAll('_',' ');
const frictionTypes = new Set(['claim_mismatch','dead_click','rage_click','excessive_scroll']);
let range = '5m';
let selectedSession = null;
let loading = false;

function localInput(iso) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}
function selectedWindow() {
  const endTime = new Date();
  const ms = { '5m': 5 * 60000, '1h': 3600000, '24h': 86400000, '7d': 7 * 86400000 }[range] || 300000;
  return { startTime: new Date(endTime.getTime() - ms).toISOString(), endTime: endTime.toISOString() };
}
function setWindowInputs(startTime, endTime) {
  $('#reportStart').value = localInput(startTime);
  $('#reportEnd').value = localInput(endTime);
}
function stat(label, value, tone = '') {
  return `<div class="analytics-stat ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}
function renderReport(report) {
  const counts = report.counts;
  const friction = (counts.claim_mismatch || 0) + (counts.dead_click || 0) + (counts.rage_click || 0) + (counts.excessive_scroll || 0);
  $('#telemetryStatus').textContent = `${report.totalEvents} EVENT${report.totalEvents === 1 ? '' : 'S'}`;
  $('#reportWindowLabel').textContent = `${prettyTime(report.startTime)} — ${prettyTime(report.endTime)}`;
  $('#reportStats').innerHTML = [
    stat('SESSIONS', report.totalSessions), stat('CLAIM MISMATCHES', counts.claim_mismatch || 0, counts.claim_mismatch ? 'warning' : ''),
    stat('DEAD CLICKS', counts.dead_click || 0, counts.dead_click ? 'warning' : ''),
    stat('RAGE CLICKS', counts.rage_click || 0, counts.rage_click ? 'warning' : ''),
    stat('EXCESSIVE SCROLL', counts.excessive_scroll || 0, counts.excessive_scroll ? 'warning' : '')
  ].join('');
  if (!report.buckets.length) $('#timelineBars').innerHTML = '<p class="analytics-empty">No telemetry in this time window. Run a comparison or use the demo store.</p>';
  else {
    const buckets = report.buckets.slice(-36);
    const max = Math.max(1, ...buckets.map(item => item.events));
    $('#timelineBars').innerHTML = buckets.map(item => `<div class="time-bucket" title="${escapeHtml(prettyTime(item.startTime))}: ${item.friction} friction / ${item.events} events"><div class="bucket-bars"><span class="other" style="height:${item.events > item.friction ? Math.max(3, Math.round((item.events-item.friction) / max * 100)) : 0}%"></span><span class="friction" style="height:${item.friction ? Math.max(4, Math.round(item.friction / max * 100)) : 0}%"></span></div><small>${escapeHtml(new Date(item.startTime).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))}</small></div>`).join('');
  }
  const top = report.hotspots[0];
  const sessionBuckets = {
    controlClean: report.sessions.filter(item => item.variant === 'A' && !item.frictionCount).length,
    challengerClean: report.sessions.filter(item => item.variant === 'B' && !item.frictionCount).length,
    challengerFriction: report.sessions.filter(item => item.variant === 'B' && item.frictionCount).length
  };
  $('#agentBrief').innerHTML = report.totalEvents ? `<p><strong>${friction} friction event${friction === 1 ? '' : 's'}</strong> across ${report.totalSessions} session${report.totalSessions === 1 ? '' : 's'} in the selected window.</p><p><b>Representative A/B buckets in the listed sessions:</b> control clear ${sessionBuckets.controlClean} · challenger clear ${sessionBuckets.challengerClean} · challenger with friction ${sessionBuckets.challengerFriction}. Variant comes from the storefront URL; open one journey in each bucket below.</p>${top ? `<p>Most frequent: <b>${escapeHtml(eventName(top.eventType))}</b> at <code>${escapeHtml(top.element || top.pageUrl || 'unknown target')}</code> (${top.count}). Last seen ${escapeHtml(prettyTime(top.lastSeen))}.</p>` : '<p>No friction events recorded in this range.</p>'}<p class="report-caveat">Simulation rows model claim checks. Dead clicks, rage clicks, and scrolling are recorded only from actual demo-store browser interactions.</p>` : '<p>No activity yet. Run a comparison to create modelled shopper sessions, or interact with the demo store to capture browser events.</p>';
  $('#hotspotList').innerHTML = report.hotspots.length ? report.hotspots.map(item => `<div class="dense-row"><div><strong>${escapeHtml(eventName(item.eventType))}</strong><small>${escapeHtml(item.pageUrl || 'demo store')} · ${escapeHtml(item.element || 'journey')}</small></div><b>${item.count}</b></div>`).join('') : '<p class="analytics-empty">No friction hotspots in this range.</p>';
  $('#sessionList').innerHTML = report.sessions.length ? report.sessions.slice(0, 30).map(item => `<button class="session-row ${item.sessionId === selectedSession ? 'selected' : ''}" data-session="${escapeHtml(item.sessionId)}"><span><strong>${escapeHtml(item.personaId || (item.source === 'observed_store' ? 'Store browser' : 'Shopper'))} · ${item.variant}</strong><small>${escapeHtml(prettyTime(item.startTime))} · ${escapeHtml(item.source.replace('_',' '))}</small></span><b class="${item.frictionCount ? 'fail' : 'pass'}">${item.frictionCount} friction</b></button>`).join('') : '<p class="analytics-empty">No sessions in this range.</p>';
  if (selectedSession && !report.sessions.some(item => item.sessionId === selectedSession)) {
    selectedSession = null;
    $('#sessionTitle').textContent = 'Select a session';
    $('#sessionMeta').textContent = '';
    $('#sessionTimeline').textContent = 'Choose a session above to inspect the exact event order.';
  }
}
export async function refreshReport({ updateInputs = false } = {}) {
  if (loading) return;
  loading = true;
  try {
    let startTime, endTime;
    if (range === 'custom') {
      startTime = new Date($('#reportStart').value).toISOString();
      endTime = new Date($('#reportEnd').value).toISOString();
    } else ({ startTime, endTime } = selectedWindow());
    if (updateInputs) setWindowInputs(startTime, endTime);
    const params = new URLSearchParams({ startTime, endTime, source: $('#reportSource').value, bucketMinutes: $('#reportBucket').value });
    const response = await fetch('/api/reports/friction?' + params);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Report unavailable');
    renderReport(data);
  } catch (error) {
    $('#telemetryStatus').textContent = 'UNAVAILABLE';
    $('#agentBrief').textContent = error.message;
  } finally { loading = false; }
}
async function openSession(sessionId) {
  selectedSession = sessionId;
  $('#sessionList').querySelectorAll('.session-row').forEach(item => item.classList.toggle('selected', item.dataset.session === sessionId));
  try {
    const response = await fetch('/api/reports/session?' + new URLSearchParams({ sessionId }));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Session unavailable');
    const rows = data.events;
    $('#sessionTitle').textContent = rows.length ? `${rows[0].personaId || 'Store browser'} · ${rows[0].variant}` : 'Session not found';
    $('#sessionMeta').textContent = `${rows.length} events · ${sessionId.slice(0, 8)}`;
    $('#sessionTimeline').innerHTML = rows.length ? rows.map((item, index) => `<div class="timeline-row ${frictionTypes.has(item.eventType) ? 'friction' : ''}"><span class="timeline-index">${String(index + 1).padStart(2,'0')}</span><time>${escapeHtml(prettyTime(item.timestamp))}</time><div><strong>${escapeHtml(eventName(item.eventType))}</strong><small>${escapeHtml(item.detail || item.element || item.pageUrl)}</small></div><code>${escapeHtml(item.element)}</code></div>`).join('') : 'No events recorded.';
  } catch (error) { $('#sessionTimeline').textContent = error.message; }
}
export function initReports() {
  const initialWindow = selectedWindow();
  setWindowInputs(initialWindow.startTime, initialWindow.endTime);
  document.querySelectorAll('[data-range]').forEach(button => button.addEventListener('click', () => {
    range = button.dataset.range;
    document.querySelectorAll('[data-range]').forEach(item => item.classList.toggle('selected', item === button));
    $('#reportBucket').value = ({ '5m':'1', '1h':'5', '24h':'60', '7d':'60' })[range];
    refreshReport({ updateInputs: true });
  }));
  $('#applyRange').addEventListener('click', () => { range = 'custom'; document.querySelectorAll('[data-range]').forEach(item => item.classList.remove('selected')); refreshReport(); });
  $('#reportSource').addEventListener('change', () => refreshReport());
  $('#reportBucket').addEventListener('change', () => refreshReport());
  $('#sessionList').addEventListener('click', event => { const button = event.target.closest('[data-session]'); if (button) openSession(button.dataset.session); });
  refreshReport();
  setInterval(() => { if ($('#view-evidence').classList.contains('active') && range !== 'custom') refreshReport({ updateInputs: true }); }, 15000);
}
