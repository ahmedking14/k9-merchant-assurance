import { refreshAssurance } from './assurance.js';

const $ = selector => document.querySelector(selector);
const storageKey = 'k9-guided-demo-v1';
const sessionKey = 'k9-guided-demo-session-v1';
const stages = [
  {
    title: 'Start with the customer promise.',
    copy: 'The store advertises 20% off a first order. You will make challenger B lose that discount on purpose, then see whether K9 catches it. Control A stays healthy.',
    target: '.promise-visual', side: 'left', action: 'Introduce the fault'
  },
  {
    title: 'Compare the shopper journeys.',
    copy: 'The local simulation sends the same five shopper goals through A and B. It points you toward a problem; it is not browser proof.',
    target: '#compare .compare-layout', side: 'right', action: 'Compare five shoppers'
  },
  {
    title: 'Now Kane checks the real cart.',
    copy: 'Kane opens challenger B in Chrome, follows the reviewed test, and reads the displayed discount and total. Run it live if you want a new receipt, or inspect the saved red receipt without using credits.',
    target: '#verify .kane-workflow', side: 'right', action: 'Run Kane live · uses credits', alternate: 'Use saved red receipt'
  },
  {
    title: 'Read the result before changing anything.',
    copy: 'The report separates a shopper-model warning from Kane’s actual cart observation. A broken offer needs a repair and a fresh browser check.',
    target: '#reportCard', side: 'left', action: 'Apply the demo repair'
  },
  {
    title: 'Check the shopper journey again.',
    copy: 'The repair restores the first-order discount in challenger B. Compare the same five goals so you can see whether the directional warning clears.',
    target: '#compare .compare-layout', side: 'right', action: 'Compare after repair'
  },
  {
    title: 'Prove the repair in Chrome.',
    copy: 'A green simulation is still only a model. Run the same Kane test against the repaired cart, or inspect the saved green receipt without using credits.',
    target: '#verify .kane-workflow', side: 'right', action: 'Verify repair with Kane · uses credits', alternate: 'Use saved green receipt'
  },
  {
    title: 'Make the merchant decision.',
    copy: 'Check the observed discount, total, evidence pack, and next action. Keep the generated cart test as a regression check.',
    target: '#reportCard', side: 'left', action: 'Finish walkthrough'
  }
];

let stage = 0;
let active = false;
let busy = false;
let proof = null;
let comparison = null;
let highlighted = null;
let watcher = 0;

function saveSession() {
  sessionStorage.setItem(sessionKey, JSON.stringify({ active, stage, proof, comparison }));
}

function shortId(value) { return value?.slice(0, 8) || '—'; }
function setStatus(message, tone = '') {
  const element = $('#guideStatus');
  element.textContent = message;
  element.className = `guide-status ${tone}`;
}
function setBusy(value) {
  busy = value;
  $('#guidePrimary').disabled = value || (Boolean(window.K9_HOSTED_DEMO) && [2, 5].includes(stage));
  $('#guideSecondary').disabled = value;
  $('#guideRestart').disabled = value;
}

function highlight(target) {
  highlighted?.classList.remove('guide-focus');
  highlighted = document.querySelector(target);
  if (highlighted) {
    highlighted.classList.add('guide-focus');
    highlighted.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }
}

async function status() {
  const response = await fetch('/api/assurance/status');
  if (!response.ok) throw new Error('Kane status is unavailable');
  return response.json();
}

function renderProof() {
  const box = $('#guideProof');
  const simulation = [2, 5].includes(stage) && comparison;
  const receipt = [3, 6].includes(stage) && proof;
  box.hidden = !simulation && !receipt;
  if (box.hidden) return;
  box.className = `guide-proof ${simulation ? comparison.b < comparison.a ? 'bad' : 'good' : proof.kind === 'red' ? 'bad' : 'good'}`;
  const source = simulation ? 'LOCAL SIMULATION · DIRECTIONAL' : proof.source === 'saved' ? 'SAVED KANE RECEIPT · HISTORICAL' : 'CURRENT KANE RECEIPT';
  box.replaceChildren();
  const label = document.createElement('strong');
  label.textContent = source;
  const values = document.createElement('span');
  values.textContent = simulation ? `Control A ${comparison.a}% · Challenger B ${comparison.b}%` : `${proof.discount || 'Discount not captured'} · ${proof.total || 'Total not captured'} · pack ${shortId(proof.id)}`;
  box.append(label, values);
}

function render() {
  if (!active) return;
  const item = stages[stage];
  const panel = $('#guidePanel');
  panel.hidden = false;
  panel.dataset.side = item.side;
  document.body.classList.add('guide-open');
  document.body.dataset.guideSide = item.side;
  $('#guideStep').textContent = `STEP ${stage + 1} OF ${stages.length}`;
  $('#guideTitle').textContent = item.title;
  $('#guideCopy').textContent = item.copy + (window.K9_HOSTED_DEMO && [2, 5].includes(stage) ? ' Fresh Kane runs require the local app; use the saved receipt here.' : '') + ([3, 6].includes(stage) && proof?.source === 'saved' ? ' This saved receipt is a historical example, not a fresh check of the current scenario.' : '');
  $('#guidePrimary').innerHTML = `${item.action} <span aria-hidden="true">↗</span>`;
  const alternate = $('#guideSecondary');
  alternate.hidden = !item.alternate;
  if (item.alternate) alternate.textContent = item.alternate;
  $('#guideProgress').innerHTML = stages.map((_, index) => `<i class="${index < stage ? 'done' : index === stage ? 'current' : ''}"></i>`).join('');
  setBusy(busy);
  setStatus('');
  renderProof();
  if (stage === 3 && proof?.source === 'saved') {
    const history = $('#reportCard .report-history');
    if (history) history.open = true;
    highlight('#reportCard .report-story .red');
  } else if (stage === 6 && proof?.source === 'saved') {
    const history = $('#reportCard .report-history');
    if (history) history.open = true;
    highlight('#reportCard .report-story .green');
  } else highlight(item.target);
  saveSession();
}

function next() { stage = Math.min(stage + 1, stages.length - 1); render(); }
function previous() { if (!busy && stage > 0) { stage--; render(); } }

function waitForAction(success, failure, trigger) {
  return new Promise((resolve, reject) => {
    const done = event => { cleanup(); resolve(event.detail); };
    const fail = event => { cleanup(); reject(new Error(event.detail?.message || 'The action did not finish')); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('The action timed out. Try again.')); }, 15000);
    const cleanup = () => {
      clearTimeout(timeout);
      document.removeEventListener(success, done);
      document.removeEventListener(failure, fail);
    };
    document.addEventListener(success, done, { once: true });
    document.addEventListener(failure, fail, { once: true });
    trigger();
  });
}

async function setFault(value) {
  const input = $('#scenarioFault');
  if (input.checked === value) return;
  await waitForAction('k9:scenario-changed', 'k9:scenario-error', () => {
    input.checked = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function compare() {
  $('#sampleCount').value = '5';
  const result = await waitForAction('k9:simulation-complete', 'k9:simulation-error', () => $('#runSimulation').click());
  const rate = rows => Math.round(rows.filter(row => row.pass).length / rows.length * 100);
  comparison = { a: rate(result.control), b: rate(result.challenger) };
}

function readCart(run) {
  return run?.members?.find(member => member.observedCart)?.observedCart || {};
}

async function watchKane(previousId, kind) {
  const token = ++watcher;
  const deadline = Date.now() + 10 * 60 * 1000;
  setBusy(true);
  setStatus('Kane is working in Chrome. The live stages and report card update beside this guide.');
  while (active && token === watcher) {
    if (Date.now() > deadline) throw new Error('Kane has not returned a new receipt yet. Check the live status and try again.');
    const result = await status();
    if (result.job?.state === 'error') throw new Error(result.job.message || 'Kane stopped before saving a receipt');
    if (result.job?.state !== 'running' && result.run?.executionId && result.run.executionId !== previousId) {
      await refreshAssurance();
      const cart = readCart(result.run);
      proof = { kind, source: 'live', id: result.run.executionId, discount: cart.discount, total: cart.total, outcome: result.run.status };
      if (kind === 'red' && !result.run.confirmedProductBugs?.length) {
        setStatus('Kane finished, but did not confirm the expected defect. Review the report before applying a repair.', 'warning');
        return;
      }
      if (kind === 'green' && result.run.status !== 'passed') {
        setStatus('Kane did not verify the repair. Review the report and rerun after correcting the store.', 'warning');
        return;
      }
      next();
      return;
    }
    setStatus(result.job?.message || 'Waiting for Kane to finish the reviewed browser test…');
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
}

async function runKane(kind) {
  const before = await status();
  if (before.job?.state !== 'running') {
    const response = await fetch('/api/assurance/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'challenger' })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Kane could not start');
    await refreshAssurance();
  }
  await watchKane(before.run?.executionId, kind);
}

async function useSaved(kind) {
  const result = await status();
  const run = kind === 'red' ? result.redRun : result.greenRun;
  if (!run?.executionId) throw new Error(`No saved ${kind} Kane receipt is available`);
  if (kind === 'red' && !run.confirmedProductBugs?.length) throw new Error('The saved red receipt does not confirm a product defect');
  if (kind === 'green' && run.status !== 'passed') throw new Error('The saved green receipt is not a passing Kane run');
  const cart = readCart(run);
  proof = { kind, source: 'saved', id: run.executionId, discount: cart.discount, total: cart.total, outcome: run.status };
  next();
}

async function primary() {
  if (busy) return;
  if (window.K9_HOSTED_DEMO && [2, 5].includes(stage)) return;
  if (stage === 6) { close(); return; }
  setBusy(true);
  setStatus('Working…');
  try {
    if (stage === 0) await setFault(true);
    if (stage === 1 || stage === 4) await compare();
    if (stage === 2 || stage === 5) { await runKane(stage === 2 ? 'red' : 'green'); return; }
    if (stage === 3) await setFault(false);
    next();
  } catch (error) { setStatus(error.message, 'error'); }
  finally { setBusy(false); }
}

async function secondary() {
  if (busy || ![2, 5].includes(stage)) return;
  setBusy(true);
  try { await useSaved(stage === 2 ? 'red' : 'green'); }
  catch (error) { setStatus(error.message, 'error'); }
  finally { setBusy(false); }
}

function close() {
  active = false;
  watcher++;
  highlighted?.classList.remove('guide-focus');
  highlighted = null;
  $('#guidePanel').hidden = true;
  document.body.classList.remove('guide-open');
  delete document.body.dataset.guideSide;
  localStorage.setItem(storageKey, 'seen');
  sessionStorage.removeItem(sessionKey);
  setBusy(false);
}

async function open(resume = false) {
  if (!resume) { stage = 0; proof = null; comparison = null; }
  active = true;
  render();
  if ([2, 5].includes(stage)) {
    try {
      const current = await status();
      if (current.job?.state === 'running') watchKane(current.run?.executionId, stage === 2 ? 'red' : 'green')
        .catch(error => setStatus(error.message, 'error'))
        .finally(() => setBusy(false));
    } catch { /* The primary action will display a useful error. */ }
  }
}

export function initWalkthrough() {
  $('#guideLaunch').addEventListener('click', () => open());
  $('#guideClose').addEventListener('click', close);
  $('#guideRestart').addEventListener('click', () => open());
  $('#guidePrimary').addEventListener('click', primary);
  $('#guideSecondary').addEventListener('click', secondary);
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { close(); return; }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName)) return;
    if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      previous();
    } else if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (busy) return;
      if ([2, 5].includes(stage)) secondary();
      else primary();
    }
  });
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (saved?.active && Number.isInteger(saved.stage) && saved.stage >= 0 && saved.stage < stages.length) {
      stage = saved.stage;
      proof = saved.proof || null;
      comparison = saved.comparison || null;
      open(true);
      return;
    }
  } catch { sessionStorage.removeItem(sessionKey); }
  if (!localStorage.getItem(storageKey)) open();
}
