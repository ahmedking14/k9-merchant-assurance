const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function asset(label, value) { return `<div class="assurance-asset"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }

export async function refreshAssurance() {
  try {
    const response = await fetch('/api/assurance/status');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Assurance unavailable');
    const simulated = Boolean(localStorage.getItem('swarm-last-run'));
    $('#assuranceStages').innerHTML = data.stages.map((stage, index) => {
      const complete = stage.id === 'simulate' ? simulated : stage.state === 'complete';
      return `<div class="assurance-stage ${complete ? 'complete' : ''}"><b>${complete ? '✓' : String(index + 1).padStart(2, '0')}</b><span><strong>${escapeHtml(stage.label)}</strong><small>${complete ? 'AVAILABLE' : 'AWAITING EVIDENCE'}</small></span></div>`;
    }).join('');
    const failures = data.run?.failedAssertions?.length || 0;
    const coverage = data.coverage?.pct ?? data.coverage?.percent ?? data.coverage?.coverage?.pct;
    $('#assuranceStatus').textContent = data.run?.status ? data.run.status.toUpperCase() : data.tests.length ? 'TESTS DESIGNED' : 'KANE PENDING';
    $('#assuranceAssets').innerHTML = [
      asset('Requirement', data.requirement),
      asset('Approved tests', data.tests.length ? 't-4 challenger cart · t-2 control cart' : 'Awaiting Kane design'),
      asset('Deferred', data.tests.length ? 't-3 returning shopper · fixture needed' : 'None yet'),
      asset('Browser run', data.run?.status ? `${data.run.status} · ${failures} failed assertion${failures === 1 ? '' : 's'}` : 'Not run'),
      asset('Red → green', data.redRun?.confirmedProductBugs?.length && data.greenRun?.status === 'passed' ? `Confirmed defect · ${data.redRun.executionId?.slice(0, 8)} → ${data.greenRun.executionId?.slice(0, 8)} passed` : 'Awaiting paired Kane runs'),
      asset('Control replay', data.controlRun?.status === 'passed' ? `Passed · ${data.controlRun.executionId?.slice(0, 8)}` : 'Not captured'),
      asset('Evidence pack', data.run?.executionId ? `Sealed · ${data.run.executionId?.slice(0, 8)}` : 'Not sealed'),
      asset('Coverage', coverage != null && Number.isFinite(Number(coverage)) ? `${Number(coverage).toFixed(1)}% · ${data.coverage?.criteria?.proven ?? 0}/${data.coverage?.criteria?.total ?? 0} criteria` : data.coverage ? 'Figure captured' : 'Not measured')
    ].join('') + (data.run?.members?.length ? `<div class="assurance-member-list">${data.run.members.map(member => `<div class="assurance-member ${member.status === 'passed' ? 'passed' : 'failed'}"><span>${member.status === 'passed' ? '✓' : '!'}</span><div><strong>${escapeHtml(member.test)}</strong><small>${escapeHtml(member.failureKind === 'automation' ? `Automation issue · ${member.failure || ''}` : member.failure || `Kane browser test ${member.status}`)}</small></div></div>`).join('')}</div>` : '');
    $('#triageMode').textContent = data.run?.status ? 'Kane evidence available for triage.' : 'Kane verification pending; agent findings will be labeled accordingly.';
  } catch (error) { $('#assuranceStatus').textContent = 'UNAVAILABLE'; $('#assuranceAssets').textContent = error.message; }
}

async function runTriage() {
  const button = $('#runTriage');
  button.disabled = true;
  $('#triageStatus').textContent = 'ANALYZING';
  $('#triageResults').textContent = 'Reading the selected telemetry window and available Kane artifacts…';
  try {
    const endTime = $('#reportEnd').value ? new Date($('#reportEnd').value).toISOString() : new Date().toISOString();
    const startTime = $('#reportStart').value ? new Date($('#reportStart').value).toISOString() : new Date(Date.now() - 86400000).toISOString();
    const response = await fetch('/api/assurance/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startTime, endTime }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Triage failed');
    $('#triageStatus').textContent = data.mode.toUpperCase();
    $('#triageResults').innerHTML = data.issues.map(issue => `<div class="triage-issue"><div class="triage-issue-head"><b>${escapeHtml(issue.priority)}</b><h4>${escapeHtml(issue.title)}</h4></div><p>${escapeHtml(issue.finding)}</p><small>EVIDENCE · ${escapeHtml(issue.evidence)}</small><p class="fix"><b>Proposed fix · </b>${escapeHtml(issue.proposedFix)}</p></div>`).join('') + `<span class="assurance-note">${data.run?.status ? 'Kane run evidence included.' : 'No Kane run has been captured yet; recommendations rely on local simulation only.'} A fix is verified only after a new Kane run passes.</span>`;
  } catch (error) { $('#triageStatus').textContent = 'UNAVAILABLE'; $('#triageResults').textContent = error.message; }
  finally { button.disabled = false; }
}

export function initAssurance() {
  $('#runTriage').addEventListener('click', runTriage);
  refreshAssurance();
}
