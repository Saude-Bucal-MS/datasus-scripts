import { access, constants, mkdir } from 'fs/promises';

export async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string) {
  return access(filePath, constants.F_OK | constants.R_OK)
    .then(() => true)
    .catch(() => false);
}
