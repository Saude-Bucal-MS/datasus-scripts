import { accessSync, constants, mkdirSync } from 'fs';

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
