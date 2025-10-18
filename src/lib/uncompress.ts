import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { ensureDir, fileExists } from '../utils/fs.js';

const pExec = promisify(exec);

export async function uncompress(filepath: string, destDir?: string) {
  if (!(await fileExists(filepath))) throw new Error(`File not found: ${filepath}`);

  const finalDestDir = destDir || path.dirname(filepath);

  await ensureDir(finalDestDir);

  const destPath = path.join(finalDestDir, path.basename(filepath).replace(/\.dbc$/i, '.dbf'));

  return pExec(`./deps/blast-dbf/blast-dbf ${filepath} ${destPath}`)
    .then(() => destPath)
    .catch((error) => Promise.reject(new Error(`Failed to uncompress file: ${error.message}`)));
}
