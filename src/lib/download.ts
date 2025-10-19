import { Client as FtpClient } from 'basic-ftp';
import path from 'path';
import { FileAlreadyExistsError } from '../utils/errors.js';
import { ensureDir, fileExists } from '../utils/fs.js';

/**
 * Downloads a file from the FTP server.
 * @param filename The name of the file to download.
 * @param destDir The destination directory.
 * @param opts Download options.
 * @returns The path to the downloaded file.
 */
export async function download(
  filename: string,
  destDir: string,
  opts?: { override?: boolean },
): Promise<string> {
  const filepath = path.join(destDir, filename);

  if (fileExists(filepath) && !opts?.override) {
    throw new FileAlreadyExistsError(`File already exists: ${filepath}`);
  }

  ensureDir(destDir);

  const ftpClient = new FtpClient();

  await Promise.resolve()
    .then(() => ftpClient.access({ host: 'ftp.datasus.gov.br', secure: false }))
    .then(() =>
      ftpClient.downloadTo(filepath, `/dissemin/publicos/SIASUS/200801_/Dados/${filename}`),
    )
    .then(() => !ftpClient.closed && ftpClient.close());

  return filepath;
}
