import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { BlastDbfNotFoundError, FileAlreadyExistsError } from '../utils/errors.js';
import { fileExists } from '../utils/fs.js';
import { unzip } from '../utils/unzip.js';

/**
 * Uncompresses a file.
 * @param filepath The path to the file.
 * @param opts Options for uncompressing.
 * @returns The path to the uncompressed file.
 */
export type UncompressFn = (
  filepath: string,
  opts?: { destDir?: string; override?: boolean },
) => Promise<string>;

/**
 * Uncompresses a .dbc file using blast-dbf.
 */
export const uncompressDBC: UncompressFn = async (filepath, opts) => {
  const finalDestDir = opts?.destDir || path.dirname(filepath);
  const destPath = path.join(finalDestDir, path.basename(filepath).replace(/\.dbc$/i, '.dbf'));

  if (fileExists(destPath) && !opts?.override) {
    throw new FileAlreadyExistsError(`Uncompressed file already exists: ${destPath}`);
  }

  const blastDbfDir = path.resolve('./deps', 'blast-dbf', 'blast-dbf');
  if (!fileExists(blastDbfDir)) {
    throw new BlastDbfNotFoundError(
      `blast-dbf executable not found at ${blastDbfDir}. Please ensure it is built and available.`,
    );
  }

  execFileSync(blastDbfDir, [filepath, destPath], { stdio: 'ignore', shell: true });

  return filepath;
};

/**
 * Uncompresses a .zip file using unzip.
 */
export const uncompressPopZIP: UncompressFn = async (filepath, opts) => {
  const finalDestDir = opts?.destDir || path.dirname(filepath);
  const destPath = path.join(finalDestDir, `${path.basename(filepath, '.zip')}.dbf`);

  if (fileExists(destPath) && !opts?.override) {
    throw new FileAlreadyExistsError(`Uncompressed file already exists: ${destPath}`);
  }

  const filename = path.basename(filepath, '.zip').replace('SBR', '').concat('.dbf');
  await unzip.single(filepath, filename, destPath);

  return destPath;
};
