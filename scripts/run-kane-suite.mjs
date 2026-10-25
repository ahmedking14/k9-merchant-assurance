import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reports = path.join(root, 'reports');
const paths = [
  '.testmuai/tests/challenger-cart-exposes-missing-first-order-discount-2_test.md',
  '.testmuai/tests/control-cart-honors-first-order-discount_test.md'
];
const verifyOnly = process.argv.includes('--verify-existing');
const ci = process.env.CI === 'true';
const username = process.env.KANE_USERNAME;
const accessKey = process.env.KANE_ACCESS_KEY;
if (ci && !verifyOnly && (!username || !accessKey)) {
  console.error('Kane CI needs KANE_USERNAME and KANE_ACCESS_KEY repository secrets.');
  process.exit(2);
}
await mkdir(reports, { recursive: true });
let stdout;
let exit = 0;
if (verifyOnly) {
  stdout = await readFile(path.join(reports, 'kane-suite.ndjson'), 'utf8');
} else {
  const args = ['testrun', 'run', ...paths, '--agent'];
  if (ci) args.push('--headless');
  if (username && accessKey) args.push('--username', username, '--access-key', accessKey);
  const command = spawn('kane-cli', args, {
    cwd: root,
    env: { ...process.env, KANE_CLI_USER_AGENT: 'codex' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  stdout = '';
  let stderr = '';
  command.stdout.on('data', chunk => { stdout += chunk; process.stdout.write(chunk); });
  command.stderr.on('data', chunk => { stderr += chunk; process.stderr.write(chunk); });
  exit = await new Promise((resolve, reject) => {
    command.once('error', reject);
    command.once('close', resolve);
  });
  await Promise.all([
    writeFile(path.join(reports, 'kane-suite.ndjson'), stdout),
    writeFile(path.join(reports, 'kane-suite.stderr'), stderr)
  ]);
}
const events = stdout.split(/\r?\n/).filter(Boolean).flatMap(line => {
  try { return [JSON.parse(line)]; } catch { return []; }
});
const done = [...events].reverse().find(event => event.type === 'testrun_done');
const summary = [...events].reverse().find(event => event.type === 'testrun_summary');
const ingest = [...events].reverse().find(event => event.type === 'testrun_evidence_ingest');
const members = events.filter(event => ['testrun_member_end', 'testrun_authored_member_end'].includes(event.type));
const pack = done?.execution_id ? path.join(root, '.testmuai', 'evidence', `${done.execution_id}.evidence`) : null;
const receipt = {
  capturedAt: done?.ts || new Date().toISOString(),
  executionId: done?.execution_id || null,
  status: done?.overall_status || 'incomplete',
  exitCode: exit,
  totals: summary?.totals || null,
  durationSeconds: summary?.duration_s ?? null,
  evidenceIngest: ingest?.status || null,
  evidencePack: pack ? path.relative(root, pack) : null,
  members: members.map(member => ({
    test: path.basename(member.path || ''),
    status: member.status,
    failure: member.failure?.message || null
  }))
};
await writeFile(path.join(reports, 'kane-suite.json'), JSON.stringify(receipt, null, 2) + '\n');
const passed = exit === 0 && receipt.status === 'passed' && receipt.totals?.tests === paths.length &&
  receipt.totals.passed === paths.length && receipt.evidenceIngest === 'ok';
if (!passed) {
  console.error(`Kane suite failed: ${receipt.totals?.passed ?? 0}/${paths.length} passed; ${receipt.status}; exit ${exit}.`);
  process.exit(1);
}
const validation = spawn('kane-cli', ['evidence', 'validate', pack, '--json'], {
  cwd: root, env: { ...process.env, KANE_CLI_USER_AGENT: 'codex' }, stdio: ['ignore', 'pipe', 'pipe']
});
validation.stdout.on('data', chunk => process.stdout.write(chunk));
validation.stderr.on('data', chunk => process.stderr.write(chunk));
const validationExit = await new Promise((resolve, reject) => {
  validation.once('error', reject);
  validation.once('close', resolve);
});
if (validationExit !== 0) {
  console.error(`Kane evidence validation failed with exit ${validationExit}.`);
  process.exit(1);
}
console.log(`Kane suite passed: ${paths.length}/${paths.length}, evidence valid: ${receipt.evidencePack}`);
