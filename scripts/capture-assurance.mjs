import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [kind, source] = process.argv.slice(2);
if (!['run', 'coverage'].includes(kind) || !source) {
  console.error('Usage: node scripts/capture-assurance.mjs run|coverage <kane-output-file>');
  process.exit(2);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'reports');
const records = (await readFile(source, 'utf8')).split(/\r?\n/).filter(Boolean).flatMap(line => {
  try { const value = JSON.parse(line); return value && typeof value === 'object' ? [value] : []; }
  catch { return []; }
});
if (!records.length) throw new Error('No Kane JSON records found');
await mkdir(output, { recursive: true });

if (kind === 'run') {
  const done = [...records].reverse().find(row => row.type === 'testrun_done');
  if (!done) throw new Error('Kane suite has no completion record; refusing to publish a run summary');
  const members = records.filter(row => ['testrun_member_end', 'testrun_authored_member_end'].includes(row.type));
  const coverageEvent = [...records].reverse().find(row => row.type === 'coverage' && row.scope === 'run');
  async function summarizeMember(row) {
    let events = [];
    if (row.log_path) {
      try { events = (await readFile(row.log_path, 'utf8')).split(/\r?\n/).filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const verdict = [...events].reverse().find(event => event.type === 'test_md_bug_verdict');
    const assertion = events.find(event => event.type === 'step_event' && event.event === 'assertion' && event.passed === false);
    const finalCart = [...events].reverse().find(event => event.type === 'run_end' && (event.final_state?.cart_discount || event.final_state?.cart_total));
    const runEnd = [...events].reverse().find(event => event.type === 'run_end');
    const signals = runEnd?.verdict?.signals || [];
    const discountSignal = signals.find(signal => /^-\$\d+(?:\.\d{2})?$/.test(signal.excerpt || ''))?.excerpt;
    const totalSignal = signals.find(signal => /^\$\d+(?:\.\d{2})?$/.test(signal.excerpt || ''))?.excerpt;
    const observedCart = finalCart ? { discount: finalCart.final_state.cart_discount || null, total: finalCart.final_state.cart_total || null, source: 'recorded cart variables' } : discountSignal && totalSignal ? { discount: discountSignal, total: totalSignal, source: 'confirmed product verdict signals' } : null;
    const failureKind = row.status === 'passed' ? null : row.status === 'broken' ? 'infrastructure' : verdict?.category === 'agent_misstep' || verdict?.family === 'automation_bug' ? 'automation' : assertion ? 'assertion' : verdict?.confirmed ? 'product' : 'unclassified';
    const confirmedProductBug = verdict?.confirmed && verdict?.family === 'application_issue' ? {
      title: verdict.bug_title || verdict.one_liner || 'Confirmed product defect',
      detail: verdict.one_liner || '',
      confidence: verdict.confidence ?? null
    } : null;
    return { test: path.basename(row.path || ''), status: row.status, sessionId: row.session_id || null, failure: row.failure?.message || null, failureKind, observedCart, failedAssertion: assertion?.detail || null, confirmedProductBug };
  }
  const summaries = await Promise.all(members.map(summarizeMember));
  // A run where no test reached the browser says nothing about the store; keep the last real receipt.
  if (summaries.length && summaries.every(row => row.status === 'broken')) {
    const reason = summaries.find(row => row.failure)?.failure?.split('\n')[0] || 'no test started';
    console.error(`Kane could not start the browser (${reason}). No new receipt saved; the previous receipt is unchanged.`);
    process.exit(1);
  }
  const report = {
    capturedAt: done.ts || new Date().toISOString(),
    status: done.overall_status,
    executionId: done.execution_id || null,
    evidencePack: coverageEvent?.pack?.startsWith(root + path.sep) ? path.relative(root, coverageEvent.pack) : null,
    coverage: done.coverage || null,
    members: summaries.map(({ failedAssertion, confirmedProductBug, ...member }) => member),
    failedAssertions: summaries.filter(row => row.failedAssertion).map(row => ({ test: row.test, remark: row.failedAssertion })),
    confirmedProductBugs: summaries.filter(row => row.confirmedProductBug).map(row => ({ test: row.test, ...row.confirmedProductBug }))
  };
  await writeFile(path.join(output, 'kane-run.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Captured Kane ${report.status} suite: ${summaries.filter(row => row.status !== 'passed').length} non-passing test(s), ${report.failedAssertions.length} failed assertion(s).`);
} else {
  const figure = [...records].reverse().find(row => row.type === 'coverage') || records.find(row => row.coverage || row.pct);
  if (!figure) throw new Error('No Kane coverage figure found; refusing to publish a snapshot');
  const coverage = figure.coverage || figure;
  const snapshot = { capturedAt: new Date().toISOString(), status: coverage.status || coverage.state || 'reported', pct: coverage.pct ?? coverage.percent ?? null, source: 'kane-cli cover', criteria: coverage.criteria || null, usecases: coverage.usecases || null, perUc: coverage.perUc || [] };
  await writeFile(path.join(output, 'coverage.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Captured Kane coverage: ${snapshot.pct == null ? snapshot.status : snapshot.pct + '%'}.`);
}
