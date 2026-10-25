import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function createScenarioStore(file) {
  let scenario = { discountBreak: false, updatedAt: null };
  try {
    const saved = JSON.parse(await readFile(file, 'utf8'));
    if (typeof saved.discountBreak === 'boolean') scenario = { discountBreak: saved.discountBreak, updatedAt: saved.updatedAt || null };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  return {
    get: () => ({ ...scenario }),
    async set(discountBreak) {
      if (typeof discountBreak !== 'boolean') throw new Error('discountBreak must be true or false');
      if (scenario.discountBreak === discountBreak) return { ...scenario };
      const next = { discountBreak, updatedAt: new Date().toISOString() };
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(next, null, 2) + '\n');
      scenario = next;
      return { ...scenario };
    }
  };
}
