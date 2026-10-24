import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTelemetryStore } from './telemetry.mjs';
import { createAssurance } from './assurance.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(projectRoot, 'app');
const telemetry = createTelemetryStore(path.join(projectRoot, 'data', 'telemetry.jsonl'));
const assurance = createAssurance(projectRoot, telemetry);
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 1_000_000) throw new Error('Request too large');
  }
  return JSON.parse(text || '{}');
}

async function planWithOpenAI(input) {
  const allowedProducts = ['headphones', 'speaker', 'watch', 'camera'];
  const personas = Array.isArray(input.personas) ? input.personas.slice(0, 8) : [];
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions: 'You are a set of distinct simulated shoppers testing a fictional electronics store. For each persona, choose one product and a short purchase intention. Respond only within the schema. Do not pretend you used a browser or verified a checkout.',
      input: JSON.stringify({ products: [{ id: 'headphones', name: 'Halo Wireless Headphones', price: 189 }, { id: 'speaker', name: 'Pulse Portable Speaker', price: 129 }, { id: 'watch', name: 'Orbit Smartwatch', price: 219 }, { id: 'camera', name: 'Pocket Digital Camera', price: 249 }], personas, offer: input.offer || '' }),
      text: { format: { type: 'json_schema', name: 'shopper_plans', strict: true, schema: { type: 'object', additionalProperties: false, required: ['plans'], properties: { plans: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['personaId', 'productId', 'intent', 'reason'], properties: { personaId: { type: 'string' }, productId: { type: 'string', enum: allowedProducts }, intent: { type: 'string' }, reason: { type: 'string' } } } } } } } },
      max_output_tokens: 800
    })
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  const data = await response.json();
  const output = data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!output) throw new Error('OpenAI returned no shopper plans');
  const plans = JSON.parse(output).plans || [];
  return plans.filter(plan => personas.some(persona => persona.id === plan.personaId) && allowedProducts.includes(plan.productId)).slice(0, personas.length);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/status') return json(res, 200, { openaiReady: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : null });
    if (url.pathname === '/api/plan' && req.method === 'POST') {
      if (!process.env.OPENAI_API_KEY) return json(res, 503, { error: 'OpenAI API key is not configured' });
      return json(res, 200, { plans: await planWithOpenAI(await readBody(req)), source: 'openai' });
    }
    if (url.pathname === '/api/telemetry/events' && req.method === 'POST') {
      const body = await readBody(req);
      return json(res, 201, await telemetry.append(body.events));
    }
    if (url.pathname === '/api/reports/friction' && req.method === 'GET') {
      const endTime = url.searchParams.get('endTime') || new Date().toISOString();
      const startTime = url.searchParams.get('startTime') || new Date(Date.parse(endTime) - 86400_000).toISOString();
      try {
        return json(res, 200, await telemetry.report({
          startTime, endTime, source: url.searchParams.get('source') || 'all',
          bucketMinutes: Number(url.searchParams.get('bucketMinutes') || 5)
        }));
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (url.pathname === '/api/reports/session' && req.method === 'GET') {
      try { return json(res, 200, { events: await telemetry.session(url.searchParams.get('sessionId')) }); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (url.pathname === '/api/assurance/status' && req.method === 'GET') return json(res, 200, await assurance.status());
    if (url.pathname === '/api/assurance/triage' && req.method === 'POST') {
      try { return json(res, 200, await assurance.triage(await readBody(req))); }
      catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, `.${requested}`);
    if (!file.startsWith(root + path.sep)) return json(res, 403, { error: 'Forbidden' });
    if (!(await stat(file)).isFile()) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch (error) {
    json(res, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Not found' : error.message });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`K9 running at http://localhost:${port}`));
