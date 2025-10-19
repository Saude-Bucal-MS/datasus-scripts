import { exec } from 'node:child_process';
import path from 'node:path';
import {
  BlastDbfNotFoundError,
  FileAlreadyExistsError,
  FileNotFoundError,
} from '../utils/errors.js';
import { fileExists } from '../utils/fs.js';

export type UncompressOptions = {
  destDir?: string;
  override?: boolean;
};

/**
 * Uncompresses a .dbc file to a .dbf file.
 * @param filepath The path to the .dbc file.
 * @param opts Options for uncompressing.
 * @returns The path to the uncompressed .dbf file.
 */
export async function uncompress(filepath: string, opts?: UncompressOptions): Promise<string> {
  if (!fileExists(filepath)) {
    throw new FileNotFoundError(`File not found: ${filepath}`);
  }

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

  await new Promise<void>((resolve, reject) =>
    exec(`${blastDbfDir} ${filepath} ${destPath}`, (error) =>
      error ? reject(new Error(`Failed to uncompress file: ${error.message}`)) : resolve(),
    ),
  );

  return destPath;
}
