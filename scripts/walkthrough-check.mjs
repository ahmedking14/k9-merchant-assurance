import assert from 'node:assert/strict';

class Store {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class Element extends EventTarget {
  constructor() {
    super();
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.open = false;
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.classes = new Set();
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
  }
  click() { this.dispatchEvent(new Event('click')); }
  scrollIntoView() {}
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
}

const selectors = [
  '#guidePanel', '#guideProgress', '#guideStep', '#guideTitle', '#guideCopy', '#guideProof', '#guideStatus',
  '#guidePrimary', '#guideSecondary', '#guideClose', '#guideRestart', '#guideLaunch', '#scenarioFault',
  '#sampleCount', '#runSimulation', '.promise-visual', '#compare .compare-layout', '#verify .kane-workflow',
  '#reportCard', '#reportCard .report-history', '#reportCard .report-story .red', '#reportCard .report-story .green'
];
const elements = new Map(selectors.map(selector => [selector, new Element()]));
elements.get('#guidePanel').hidden = true;
elements.get('#guideProof').hidden = true;
elements.get('#guideSecondary').hidden = true;
globalThis.localStorage = new Store();
globalThis.sessionStorage = new Store();
globalThis.document = new EventTarget();
document.body = new Element();
document.querySelector = selector => elements.get(selector) || null;
document.createElement = () => new Element();

const redRun = { executionId: '82e11c29-99d8-434e-8909-dde3e4976761', status: 'failed', confirmedProductBugs: [{ title: 'Missing discount' }], members: [{ observedCart: { discount: '-$0.00', total: '$189.00' } }] };
const greenRun = { executionId: '25a9fab4-87f8-49f4-beb4-c7c8ec639db9', status: 'passed', members: [{ observedCart: { discount: '-$37.80', total: '$151.20' } }] };
globalThis.fetch = async url => {
  assert.equal(url, '/api/assurance/status');
  return { ok: true, json: async () => ({ redRun, greenRun, job: { state: 'idle' } }) };
};

elements.get('#scenarioFault').addEventListener('change', () => {
  queueMicrotask(() => document.dispatchEvent(new CustomEvent('k9:scenario-changed', { detail: { discountBreak: elements.get('#scenarioFault').checked } })));
});
elements.get('#runSimulation').addEventListener('click', () => {
  const broken = elements.get('#scenarioFault').checked;
  const control = Array.from({ length: 5 }, () => ({ pass: true }));
  const challenger = Array.from({ length: 5 }, (_, index) => ({ pass: !broken || index < 2 }));
  queueMicrotask(() => document.dispatchEvent(new CustomEvent('k9:simulation-complete', { detail: { control, challenger } })));
});

const { initWalkthrough } = await import('../app/walkthrough.js');
initWalkthrough();
const get = selector => elements.get(selector);
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const arrow = key => {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: key });
  document.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true, `${key} should control the walkthrough`);
};

assert.equal(get('#guidePanel').hidden, false, 'first visit should open the guide');
assert.match(get('#guideTitle').textContent, /customer promise/);
assert.equal(document.body.classes.has('guide-open'), true);

arrow('ArrowRight'); await settle();
assert.equal(get('#scenarioFault').checked, true);
assert.match(get('#guideTitle').textContent, /Compare/);
arrow('ArrowLeft'); await settle();
assert.match(get('#guideTitle').textContent, /customer promise/);
arrow('ArrowRight'); await settle();

arrow('ArrowDown'); await settle();
assert.match(get('#guideTitle').textContent, /Kane checks/);
assert.match(get('#guideProof').children[1].textContent, /Control A 100% · Challenger B 40%/);

arrow('ArrowRight'); await settle();
assert.match(get('#guideProof').children[0].textContent, /HISTORICAL/);
assert.match(get('#guideProof').children[1].textContent, /-\$0\.00 · \$189\.00/);
assert.match(get('#guideCopy').textContent, /not a fresh check/);

arrow('ArrowRight'); await settle();
assert.equal(get('#scenarioFault').checked, false);
assert.match(get('#guideTitle').textContent, /shopper journey again/);

arrow('ArrowRight'); await settle();
assert.match(get('#guideProof').children[1].textContent, /Control A 100% · Challenger B 100%/);

arrow('ArrowRight'); await settle();
assert.match(get('#guideProof').children[0].textContent, /HISTORICAL/);
assert.match(get('#guideProof').children[1].textContent, /-\$37\.80 · \$151\.20/);

arrow('ArrowRight'); await settle();
assert.equal(get('#guidePanel').hidden, true);
assert.equal(document.body.classes.has('guide-open'), false);
assert.equal(localStorage.getItem('k9-guided-demo-v1'), 'seen');
get('#guideLaunch').click(); await settle();
assert.equal(get('#guidePanel').hidden, false, 'guided demo must remain reopenable');
console.log('Arrow-key walkthrough, safe saved Kane path, repair, and restart verified.');
