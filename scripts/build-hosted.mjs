import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAssurance } from '../assurance.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(projectRoot, 'dist');
await rm(output, { recursive: true, force: true });
await cp(path.join(projectRoot, 'app'), output, { recursive: true });
await mkdir(path.join(output, 'hosted'), { recursive: true });
const archive = await createAssurance(projectRoot, null).status();
await writeFile(path.join(output, 'hosted', 'status.json'), JSON.stringify({
  ...archive,
  run: null,
  job: { state: 'idle', message: null, phase: 'ready', step: 0 },
  hosted: true
}));
console.log('Built static hosted demo with archived Kane metadata and proof screenshots. Full evidence packs remain in the GitHub repository, outside the hosted site.');
