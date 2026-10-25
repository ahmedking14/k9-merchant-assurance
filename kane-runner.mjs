import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const testFiles = {
  challenger: '.testmuai/tests/challenger-cart-exposes-missing-first-order-discount-2_test.md',
  control: '.testmuai/tests/control-cart-honors-first-order-discount_test.md'
};

function command(binary, args, cwd, env, onLine = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let pending = '';
    child.stdout.on('data', chunk => {
      stdout += chunk;
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) onLine(line);
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

export function createKaneRunner(projectRoot) {
  let job = { state: 'idle', target: null, startedAt: null, finishedAt: null, message: null, phase: 'ready', step: 0, completedSteps: 0, activity: null };
  const env = { ...process.env, KANE_CLI_USER_AGENT: 'codex' };

  async function execute(target) {
    const reports = path.join(projectRoot, 'reports');
    await mkdir(reports, { recursive: true });
    const args = ['testrun', 'run', testFiles[target], '--no-adaptive-heal', '--author', '--agent'];
    let sessionLogPath = null;
    let reading = false;
    const pollLog = async () => {
      if (!sessionLogPath || reading) return;
      reading = true;
      try {
        const events = (await readFile(sessionLogPath, 'utf8')).split(/\r?\n/).filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
        const starts = events.filter(event => event.type === 'test_md_step_start');
        const ends = events.filter(event => event.type === 'test_md_step_end' && event.status === 'passed');
        const action = [...events].reverse().find(event => event.type === 'step_event' && event.event === 'action');
        if (starts.length) {
          job.step = Math.min(3, starts.at(-1).step_index);
          job.completedSteps = ends.length;
          job.activity = action?.detail?.slice(0, 150) || `Checking reviewed step ${job.step} of 3`;
          job.message = `Kane step ${job.step} of 3 · ${job.activity}`;
        }
      } catch (error) { if (error.code !== 'ENOENT') job.activity = 'Reading Kane browser activity'; }
      finally { reading = false; }
    };
    const timer = setInterval(pollLog, 1200);
    let result;
    try {
      result = await command('kane-cli', args, projectRoot, env, line => {
        try {
          const event = JSON.parse(line);
          if (event.type === 'testrun_start') job.executionId = event.execution_id;
          if (event.type === 'testrun_member_start') { sessionLogPath = event.log_path; job.phase = 'browser'; job.message = 'Kane opened Chrome on the challenger store'; }
          if (event.type === 'testrun_member_end') { job.phase = 'evidence'; job.message = 'Kane finished the browser test and is sealing evidence'; }
          if (event.type === 'testrun_evidence_ingest') { job.phase = 'coverage'; job.message = 'Evidence pack sealed; calculating coverage'; }
        } catch { /* Kane also prints human-readable lines. */ }
      });
      await pollLog();
    } finally { clearInterval(timer); }
    const logFile = path.join(reports, 'kane-run-latest.ndjson');
    await writeFile(logFile, result.stdout + result.stderr);
    job.phase = 'evidence';
    job.message = 'Saving Kane browser receipt';
    const capture = await command(process.execPath, ['scripts/capture-assurance.mjs', 'run', logFile], projectRoot, env);
    if (capture.code !== 0) throw new Error(capture.stderr.trim() || 'Kane did not produce a complete run receipt');
    job.phase = 'coverage';
    job.message = 'Updating Kane coverage';
    const coverage = await command('kane-cli', ['cover', '--mode', 'agent'], projectRoot, env);
    if (coverage.code === 0) {
      const coverageFile = path.join(reports, 'coverage.ndjson');
      await writeFile(coverageFile, coverage.stdout);
      await command(process.execPath, ['scripts/capture-assurance.mjs', 'coverage', coverageFile], projectRoot, env);
    }
    const receipt = JSON.parse(await readFile(path.join(reports, 'kane-run.json'), 'utf8'));
    job = { ...job, state: 'complete', phase: 'complete', step: 3, completedSteps: receipt.status === 'passed' ? 3 : job.completedSteps, finishedAt: new Date().toISOString(), message: `${target} Kane run ${receipt.status}`, executionId: receipt.executionId, outcome: receipt.status };
  }

  return {
    status: () => ({ ...job }),
    launch(target) {
      if (!testFiles[target]) throw new Error('Choose the challenger or control test');
      if (job.state === 'running') throw new Error('A Kane run is already in progress');
      job = { state: 'running', target, startedAt: new Date().toISOString(), finishedAt: null, message: 'Starting the reviewed Kane browser test', phase: 'starting', step: 0, completedSteps: 0, activity: null };
      execute(target).catch(error => { job = { ...job, state: 'error', finishedAt: new Date().toISOString(), message: error.message }; });
      return { ...job };
    }
  };
}
