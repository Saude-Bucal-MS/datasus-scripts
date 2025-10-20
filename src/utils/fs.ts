import { accessSync, constants, copyFileSync, mkdirSync, rmSync } from 'fs';
import { dirname } from 'path';
import { FileNotFoundError } from './errors.js';

/**
 * Ensures that a directory exists.
 * @param dir The path to the directory.
 */
export function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

/**
 * Checks if a file exists and is readable.
 * @param filePath The path to the file.
 * @returns True if the file exists and is readable, false otherwise.
 */
export function fileExists(filePath: string) {
  try {
    accessSync(filePath, constants.F_OK | constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function rmFile(filePath: string) {
  try {
    accessSync(filePath, constants.F_OK | constants.R_OK | constants.W_OK);
  } catch {
    throw new FileNotFoundError(`File not found: ${filePath}`);
  }

  rmSync(filePath);
}

export function mvFile(srcPath: string, destPath: string) {
  try {
    accessSync(srcPath, constants.F_OK | constants.R_OK | constants.W_OK);
  } catch {
    throw new FileNotFoundError(`File not found: ${srcPath}`);
  }

  try {
    accessSync(dirname(destPath), constants.F_OK | constants.R_OK | constants.W_OK);
  } catch (err) {
    throw new FileNotFoundError(
      `Directory not found: ${dirname(destPath)} (${(err as Error).message})`,
    );
  }

  if (fileExists(destPath)) rmFile(destPath);
  copyFileSync(srcPath, destPath);
  rmFile(srcPath);
}
