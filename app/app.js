import { defaults, products, personas, evaluateShopper, money } from './shared.js';
import { initReports, refreshReport } from './reports.js';
import { initAssurance, refreshAssurance } from './assurance.js';
import { initWalkthrough } from './walkthrough.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let scenario = null;
let latestSimulation = null;

function modelConfig() {
  const config = structuredClone(defaults);
  config.failures = Object.fromEntries(Object.keys(config.failures).map(key => [key, key === 'discountBreak' && scenario?.discountBreak]));
  return config;
}

function simulationEvents(rows, variant, startedAt) {
  const steps = ['session_start', 'claim_view', 'product_view', 'add_to_cart', 'checkout_review'];
  return rows.flatMap((row, index) => {
    const sessionId = crypto.randomUUID();
    const product = products.find(item => item.id === row.productId);
    const persona = personas.find(item => item.id === row.personaId);
    const base = Date.parse(startedAt) + index * 180;
    const common = { sessionId, source: 'simulated', variant, personaId: persona?.name || row.personaId, productId: row.productId, pageUrl: `/store.html?variant=${variant}` };
    const event = (eventType, step, element, detail, value) => ({ ...common, eventType, step, element, detail, ...(value === undefined ? {} : { value }), timestamp: new Date(base + step * 30).toISOString() });
    const events = steps.map((type, step) => event(type, step, ['journey', '#announcement', '#productGrid', '[data-add]', '#cartDrawer'][step], [persona?.goal || '', '20% off first order', product?.name || '', product?.name || '', `Cart total ${money(row.outcome.total)}`][step], step >= 3 ? row.outcome.total : undefined));
    const failed = row.checks.filter(check => !check.pass);
    if (failed.length) events.push(...failed.map((check, offset) => event('claim_mismatch', 5 + offset, '#cartFooter .cart-line', `${check.name}: ${check.detail}`, check.shortfall || undefined)));
    else events.push(event('claim_match', 5, '#cartFooter', 'Assigned promise checks passed'));
    return events;
  });
}

function renderSimulation() {
  if (!latestSimulation) return;
  const { control, challenger, scenario: runScenario, startedAt } = latestSimulation;
  const rate = rows => Math.round(rows.filter(row => row.pass).length / rows.length * 100);
  const aRate = rate(control), bRate = rate(challenger);
  const failures = challenger.filter(row => !row.pass);
  const example = challenger.find(row => row.personaId === 'deal' && row.productId === 'headphones') || challenger.find(row => row.personaId === 'deal');
  const faulted = Boolean(runScenario.discountBreak);
  $('#simulationStatus').textContent = `${challenger.length} JOURNEYS`;
  $('#simulationStatus').className = `status-chip ${failures.length ? 'bad' : 'good'}`;
  $('#simulationResult').innerHTML = `<div class="comparison-bars"><div class="comparison-row"><strong>Control A</strong><div class="comparison-track"><i style="width:${aRate}%"></i></div><b>${aRate}%</b></div><div class="comparison-row challenger ${failures.length ? 'bad' : ''}"><strong>Challenger B</strong><div class="comparison-track"><i style="width:${bRate}%"></i></div><b>${bRate}%</b></div><p class="comparison-summary"><strong>${failures.length ? `${failures.length} shopper journey${failures.length === 1 ? '' : 's'} found a broken promise.` : 'No broken promise in this local comparison.'}</strong><br/>${example ? `Deal Hunter bag: ${money(example.outcome.discount)} off · ${money(example.outcome.total)} total.` : ''} ${faulted ? 'The discount fault was on in B.' : 'The repaired discount was on in both variants.'}</p><p class="inline-note">Modelled at ${escapeHtml(new Date(startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}. Kane’s separate Chrome run checks the real cart next.</p></div>`;
  $('#flowSimulation').className = `architecture-node ${failures.length ? 'bad' : 'good'}`;
}

async function loadScenario() {
  const response = await fetch('/api/scenario');
  if (!response.ok) throw new Error('Could not load the shared storefront scenario');
  scenario = await response.json();
  $('#scenarioFault').checked = scenario.discountBreak;
  $('#scenarioStatus').textContent = scenario.discountBreak ? 'Fault active in challenger B. The real demo store and Kane will see it.' : 'Repaired discount active in both variants. Kane will check this same state.';
  $('#runSimulation').disabled = false;
  const stored = localStorage.getItem('k9-merchant-run-v2');
  if (stored) {
    try {
      const saved = JSON.parse(stored);
      if (saved.scenario?.updatedAt === scenario.updatedAt && saved.scenario?.discountBreak === scenario.discountBreak) {
        latestSimulation = saved;
        renderSimulation();
      }
    } catch { /* Ignore a stale local preview. */ }
  }
  refreshAssurance();
}

async function changeScenario() {
  const input = $('#scenarioFault');
  input.disabled = true;
  $('#scenarioStatus').textContent = 'Updating the shared demo store…';
  try {
    const response = await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discountBreak: input.checked }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not change the scenario');
    scenario = data;
    latestSimulation = null;
    localStorage.removeItem('k9-merchant-run-v2');
    $('#simulationStatus').className = 'status-chip';
    $('#simulationStatus').textContent = 'RERUN NEEDED';
    $('#simulationResult').innerHTML = '<div class="empty-state"><span class="empty-glyph">◎</span><strong>The scenario changed.</strong><p>Compare shoppers again, then rerun Kane against this same storefront state.</p></div>';
    $('#flowSimulation').className = 'architecture-node';
    $('#scenarioStatus').textContent = scenario.discountBreak ? 'Fault active in challenger B. The real demo store and Kane will see it.' : 'Repaired discount active in both variants. Kane will check this same state.';
    refreshAssurance();
    document.dispatchEvent(new CustomEvent('k9:scenario-changed', { detail: { ...scenario } }));
  } catch (error) {
    input.checked = Boolean(scenario?.discountBreak);
    $('#scenarioStatus').textContent = error.message;
    document.dispatchEvent(new CustomEvent('k9:scenario-error', { detail: { message: error.message } }));
  } finally { input.disabled = false; }
}

async function runSimulation() {
  if (!scenario) return;
  const button = $('#runSimulation');
  button.disabled = true;
  button.textContent = 'Comparing…';
  try {
    const count = Number($('#sampleCount').value);
    const config = modelConfig();
    const cohort = Array.from({ length: count }, (_, index) => {
      const persona = personas[index % personas.length];
      const preferred = products.find(item => item.id === persona.defaultProduct);
      return { persona, product: index < personas.length ? preferred : products[(products.indexOf(preferred) + Math.floor(index / personas.length)) % products.length] };
    });
    const control = cohort.map(({ persona, product }) => evaluateShopper(persona, product, 'A', config));
    const challenger = cohort.map(({ persona, product }) => evaluateShopper(persona, product, 'B', config));
    const startedAt = new Date().toISOString();
    latestSimulation = { control, challenger, scenario: { ...scenario }, startedAt };
    localStorage.setItem('k9-merchant-run-v2', JSON.stringify(latestSimulation));
    renderSimulation();
    try {
      await fetch('/api/telemetry/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: [...simulationEvents(control, 'A', startedAt), ...simulationEvents(challenger, 'B', startedAt)] }) });
      refreshReport({ updateInputs: true });
    } catch { $('#scenarioStatus').textContent = 'Comparison complete; the detailed telemetry could not be saved.'; }
    refreshAssurance();
    document.dispatchEvent(new CustomEvent('k9:simulation-complete', { detail: latestSimulation }));
  } catch (error) {
    $('#scenarioStatus').textContent = error.message;
    document.dispatchEvent(new CustomEvent('k9:simulation-error', { detail: { message: error.message } }));
  } finally { button.disabled = false; button.innerHTML = 'Compare shoppers <span>↗</span>'; }
}

async function init() {
  $('#runSimulation').disabled = true;
  $('#scenarioFault').addEventListener('change', changeScenario);
  $('#runSimulation').addEventListener('click', runSimulation);
  initReports();
  initAssurance();
  try { await loadScenario(); }
  catch (error) { $('#scenarioStatus').textContent = error.message; }
  initWalkthrough();
}

init();
