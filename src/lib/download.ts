import { Client as FtpClient } from 'basic-ftp';
import path from 'path';
import { FileAlreadyExistsError, UnsupportedFileTypeError } from '../utils/errors.js';
import { fileExists } from '../utils/fs.js';

/**
 * Downloads a file from the FTP server.
 * @param filename The name of the file to download.
 * @param destDir The destination directory.
 * @param opts Download options.
 * @returns The path to the downloaded file.
 */
export type DownloadFn = (
  filename: string,
  destDir: string,
  opts?: { override?: boolean },
) => Promise<string>;

// Implementation of the download function
export const ftpDownloader: DownloadFn = async (filename, destDir, opts) => {
  const filepath = path.join(destDir, filename);

  if (fileExists(filepath) && !opts?.override) {
    throw new FileAlreadyExistsError(`File already exists: ${filepath}`);
  }

  const ftpClient = new FtpClient();

  let remotePath = `/dissemin/publicos/`;

  if (filename.startsWith('PA')) remotePath += 'SIASUS/200801_/Dados/';
  else if (filename.startsWith('POPSBR')) remotePath += 'IBGE/POPSVS/';
  else throw new UnsupportedFileTypeError(`Unknown file prefix: ${filename}`);

  await Promise.resolve()
    .then(() => ftpClient.access({ host: 'ftp.datasus.gov.br', secure: false }))
    .then(() => ftpClient.downloadTo(filepath, `${remotePath}${filename}`))
    .then(() => !ftpClient.closed && ftpClient.close());

  return filepath;
};
