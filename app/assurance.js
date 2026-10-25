const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let latestStatus = null;
let repairAction = false;

function shortId(id) { return id ? id.slice(0, 8) : '—'; }
function dateLabel(value) { return value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not captured'; }
function metric(label, value, note) { return `<div class="report-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`; }

function renderRunVisual(data) {
  const running = data.job?.state === 'running';
  const runError = data.job?.state === 'error';
  const phase = data.job?.phase;
  const step = data.job?.step || 0;
  const passed = data.verificationCurrent && data.run?.status === 'passed';
  const failed = data.verificationCurrent && data.run?.confirmedProductBugs?.length;
  const stages = [...document.querySelectorAll('#runVisual .run-stage')];
  stages.forEach(stage => stage.className = 'run-stage');
  if (running) {
    stages[0].classList.add(phase === 'starting' || (phase === 'browser' && step < 3) ? 'active' : 'done');
    if (phase === 'browser' && step >= 3) stages[1].classList.add('active');
    if (phase === 'evidence' || phase === 'coverage') { stages[1].classList.add('done'); stages[2].classList.add('active'); }
  } else if (runError) {
    stages[0].classList.add('done');
    stages[Math.min(2, Math.max(0, step - 1))].classList.add('failed');
  } else if (passed || failed) {
    stages[0].classList.add('done');
    stages[1].classList.add(failed ? 'failed' : 'done');
    stages[2].classList.add('done');
  }
  const flowKane = $('#flowKane');
  const flowDecision = $('#flowDecision');
  flowKane.className = `architecture-node ${running ? 'active' : runError ? 'bad' : passed ? 'good' : failed ? 'bad' : ''}`;
  flowDecision.className = `architecture-node ${running || runError ? '' : passed ? 'good' : failed ? 'bad' : ''}`;
}

function outcome(data) {
  if (data.hosted) return { tone: '', title: 'Explore archived Kane proof', detail: 'This hosted demo compares shoppers in your browser and shows saved Kane evidence. A fresh Kane run requires the local app and Chrome.', action: data.scenario?.discountBreak ? 'Repair the demo discount' : 'Inspect the saved red and green receipts' };
  if (data.job?.state === 'running') return { tone: '', title: 'Kane is checking the current cart', detail: 'Chrome is running the reviewed test. The report card will update when Kane seals the evidence.', action: 'Wait for the Kane result' };
  if (data.job?.state === 'error') return { tone: 'bad', title: 'Kane run did not finish', detail: data.job.message || 'The browser run stopped before a new receipt was saved.', action: 'Review the error and rerun Kane' };
  if (!data.run) return { tone: '', title: 'Browser verification has not run', detail: 'The shopper comparison is directional. Run Kane to inspect the real storefront.', action: 'Run Kane on the challenger' };
  if (!data.verificationCurrent) return { tone: '', title: 'The store scenario changed', detail: 'The saved Kane receipt belongs to an earlier storefront state. Rerun the same test before making a merchant decision.', action: 'Rerun Kane for this scenario' };
  if (data.run.status === 'passed') return { tone: 'good', title: 'Verified for this discount journey', detail: 'Kane read the displayed cart discount and total in Chrome. This supports the first-order Halo Headphones journey only.', action: 'Keep this test as a regression check' };
  if (data.run.confirmedProductBugs?.length) return { tone: 'bad', title: 'Customer promise is broken', detail: 'Kane confirmed an application defect in the real challenger cart. Fix the discount logic, then rerun this same test.', action: 'Fix the cart, then rerun Kane' };
  return { tone: '', title: 'Kane needs a clean rerun', detail: 'The latest run did not prove a product defect or a passing journey. Review its failure type and rerun.', action: 'Rerun Kane' };
}

function renderReport(data, decision) {
  const run = data.run;
  const currentCart = run?.members?.find(member => member.observedCart)?.observedCart;
  const archivedCart = data.greenRun?.members?.find(member => member.observedCart)?.observedCart;
  const shownCart = currentCart || archivedCart;
  const observationNote = currentCart ? ['running', 'error'].includes(data.job?.state) ? 'previous completed Kane run' : data.verificationCurrent ? `latest Kane browser run · ${currentCart.source || 'cart observation'}` : 'previous scenario Kane browser run' : 'archived passing Kane run';
  const redBug = data.redRun?.confirmedProductBugs?.[0];
  const controlPassed = data.controlRun?.status === 'passed';
  const percent = data.coverage?.pct;
  const freshness = data.job?.state === 'running' ? '<span class="status-chip">RUNNING</span>' : data.job?.state === 'error' ? '<span class="status-chip bad">RUN ERROR</span>' : run && !data.verificationCurrent ? '<span class="status-chip">PREVIOUS SCENARIO</span>' : `<span class="status-chip ${decision.tone}">${run?.status === 'passed' && data.verificationCurrent ? 'PASSED' : redBug && data.verificationCurrent && run?.status === 'failed' ? 'DEFECT FOUND' : 'REVIEW NEEDED'}</span>`;

  $('#reportCard').innerHTML = `<div class="report-head"><div><span class="eyebrow">KANE CLI / FIRST-ORDER DISCOUNT</span><h3>${escapeHtml(decision.title)}</h3><p>${escapeHtml(decision.detail)}</p></div>${freshness}</div>
    <div class="report-metrics">${metric('PROMISED TOTAL', '$151.20', '20% off $189.00 Halo Headphones')}${metric('KANE-OBSERVED DISCOUNT', shownCart?.discount || '—', shownCart ? observationNote : 'No cart value captured yet')}${metric('KANE-OBSERVED TOTAL', shownCart?.total || '—', shownCart ? observationNote : 'No cart value captured yet')}</div>
    <details class="report-history"><summary>See the red → green evidence history · packs ${escapeHtml(shortId(data.redRun?.executionId))} / ${escapeHtml(shortId(data.greenRun?.executionId))} ↗</summary><div class="report-story"><article class="red"><div class="story-top"><b>01 / Defect found</b><span class="status-chip bad">ARCHIVED RED</span></div><p>${escapeHtml(redBug?.detail || 'No confirmed product defect is saved.')}${redBug?.confidence ? ` Kane confidence: ${Math.round(redBug.confidence * 100)}%.` : ''}</p><code>Pack ${escapeHtml(shortId(data.redRun?.executionId))} · ${escapeHtml(dateLabel(data.redRun?.capturedAt))}</code></article><article class="green"><div class="story-top"><b>02 / Same test after repair</b><span class="status-chip good">ARCHIVED GREEN</span></div><p>${data.greenRun?.status === 'passed' ? `Generated test t-4 passed with ${escapeHtml(archivedCart?.discount || 'the expected discount')} off and ${escapeHtml(archivedCart?.total || 'the expected total')}. No order was placed.` : 'No passing rerun is saved yet.'}</p><code>Pack ${escapeHtml(shortId(data.greenRun?.executionId))} · ${escapeHtml(dateLabel(data.greenRun?.capturedAt))}</code></article></div></details>
    <div class="report-foot"><span><strong>${data.hosted ? 'Archived receipts' : 'Latest receipt'}:</strong> ${escapeHtml(shortId(run?.executionId || data.greenRun?.executionId))} · ${escapeHtml(run?.status || (data.hosted ? 'historical demo' : 'not run'))} · ${escapeHtml(dateLabel(run?.capturedAt || data.greenRun?.capturedAt))}. ${run?.executionId && !data.hosted ? `<a href="/api/assurance/evidence/${encodeURIComponent(run.executionId)}" download>Download evidence pack ↗</a>` : ''} ${controlPassed ? `Control A also passed (${escapeHtml(shortId(data.controlRun.executionId))}).` : 'Control A has no passing receipt yet.'}</span><span><strong>Coverage:</strong> ${Number.isFinite(percent) ? `${percent.toFixed(1)}% historical project snapshot` : 'not measured'}. ${data.redRun?.failedAssertions?.length === 0 ? 'The red product verdict had no separate failed numerical assertion event.' : ''}</span></div>`;
}

export async function refreshAssurance() {
  try {
    const response = await fetch('/api/assurance/status');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kane status unavailable');
    latestStatus = data;
    const decision = outcome(data);
    repairAction = Boolean((data.hosted && data.scenario?.discountBreak) || (data.verificationCurrent && data.scenario?.discountBreak && data.run?.confirmedProductBugs?.length));
    renderRunVisual(data);
    const banner = $('#merchantDecision');
    banner.className = `merchant-decision ${decision.tone}`;
    banner.querySelector('strong').textContent = decision.title;
    banner.querySelector('small').textContent = decision.detail;
    $('#kaneRunState').textContent = data.hosted ? 'ARCHIVED PROOF' : data.job?.state === 'running' ? 'RUNNING' : data.job?.state === 'error' ? 'RUN ERROR' : data.verificationCurrent && data.run?.status === 'passed' ? 'LATEST PASSED' : data.verificationCurrent && data.run?.confirmedProductBugs?.length ? 'DEFECT FOUND' : data.run ? 'RERUN NEEDED' : 'READY';
    $('#kaneRunState').className = `status-chip ${data.job?.state === 'error' ? 'bad' : data.job?.state !== 'running' && data.verificationCurrent && data.run?.status === 'passed' ? 'good' : data.job?.state !== 'running' && data.verificationCurrent && data.run?.confirmedProductBugs?.length ? 'bad' : ''}`;
    $('#kaneScenario').textContent = data.scenario?.discountBreak ? 'Challenger B currently drops the discount.' : 'Challenger B currently applies the discount.';
    $('#kaneLive').textContent = data.hosted ? 'Archived Kane receipts are in the report card. Fresh browser verification runs in the local app.' : ['running', 'error'].includes(data.job?.state) ? data.job.message : data.verificationCurrent ? `Current evidence pack ${shortId(data.run?.executionId)} · ${data.run.status}.` : 'Run Kane to create a current browser receipt.';
    $('#runKane').disabled = data.hosted || data.job?.state === 'running';
    $('#runKane').innerHTML = `${data.hosted ? 'Run locally' : data.job?.state === 'running' ? 'Kane running…' : 'Run Kane'} <span>↗</span>`;
    $('#kaneModeNote').textContent = data.hosted ? 'Fresh Kane runs need the local app and Chrome. Saved receipts remain available below.' : 'Runs the real Chrome test. Kane credits are used.';
    $('#nextPrimary').disabled = data.job?.state === 'running';
    $('#nextPrimary').innerHTML = `${data.job?.state === 'running' ? 'Kane is running…' : repairAction ? 'Apply demo repair' : data.hosted ? 'View saved proof' : data.verificationCurrent && data.run?.status === 'passed' ? 'Rerun Kane' : 'Run Kane on this state'} <span>↗</span>`;
    $('#nextActionTitle').textContent = decision.action;
    $('#nextActionCopy').textContent = data.hosted ? repairAction ? 'Restore the discount in challenger B, compare again, then inspect the archived Kane proof. The archive is not a fresh check.' : 'Compare shoppers and inspect the archived red and green Kane receipts. Use the local app for a fresh browser run.' : ['running', 'error'].includes(data.job?.state) ? decision.detail : repairAction ? 'Restore the discount in challenger B for this demo. Then compare shoppers again and rerun Kane to prove the repair.' : data.verificationCurrent && data.run?.status === 'passed' ? 'The discount journey is healthy. Keep t-4 and the control check for regressions.' : decision.detail;
    $('#kaneTestSteps').innerHTML = data.testSteps?.length ? data.testSteps.map(step => `<li><b>STEP ${String(step.number).padStart(2, '0')}</b>${escapeHtml(step.instruction)}</li>`).join('') : '<li>Generated Kane test t-4 is not available yet.</li>';
    renderReport(data, decision);
    return data;
  } catch (error) {
    $('#merchantDecision').querySelector('strong').textContent = 'Kane status is unavailable';
    $('#merchantDecision').querySelector('small').textContent = error.message;
    $('#kaneLive').textContent = error.message;
  }
}

async function runKane() {
  const button = $('#runKane');
  button.disabled = true;
  $('#kaneLive').textContent = 'Starting Kane against challenger B…';
  try {
    const response = await fetch('/api/assurance/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'challenger' }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kane could not start');
    await refreshAssurance();
  } catch (error) { $('#kaneLive').textContent = error.message; button.disabled = false; }
}

async function runTriage() {
  const button = $('#runTriage');
  button.disabled = true;
  $('#triageStatus').textContent = 'READING';
  try {
    const startTime = $('#reportStart').value ? new Date($('#reportStart').value).toISOString() : new Date(Date.now() - 86400000).toISOString();
    const endTime = $('#reportEnd').value ? new Date($('#reportEnd').value).toISOString() : new Date().toISOString();
    const response = await fetch('/api/assurance/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startTime, endTime }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Triage failed');
    $('#triageStatus').textContent = data.mode.toUpperCase();
    $('#triageResults').innerHTML = data.issues.map(issue => `<article class="triage-issue"><span class="triage-priority">${escapeHtml(issue.priority)}</span><h4>${escapeHtml(issue.title)}</h4><p>${escapeHtml(issue.finding)}</p><small>Evidence: ${escapeHtml(issue.evidence)}</small><p class="fix"><b>Next action:</b> ${escapeHtml(issue.proposedFix)}</p></article>`).join('');
  } catch (error) { $('#triageStatus').textContent = 'UNAVAILABLE'; $('#triageResults').textContent = error.message; }
  finally { button.disabled = false; }
}

export function initAssurance() {
  $('#runKane').addEventListener('click', runKane);
  $('#nextPrimary').addEventListener('click', () => { if (repairAction) $('#scenarioFault').click(); else if (latestStatus?.hosted) { $('#reportCard .report-history').open = true; $('#reportCard').scrollIntoView({ behavior: 'smooth' }); } else runKane(); });
  $('#openJourneyData').addEventListener('click', () => { $('#telemetryDetails').open = true; $('#telemetryDetails').scrollIntoView({ behavior: 'smooth' }); });
  $('#runTriage').addEventListener('click', runTriage);
  refreshAssurance();
  setInterval(() => { if (latestStatus?.job?.state === 'running') refreshAssurance(); }, 2500);
}
