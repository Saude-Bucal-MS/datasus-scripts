import { Client as FtpClient } from 'basic-ftp';
import path from 'path';
import { ensureDir } from '../utils/fs.js';

export async function download(filename: string, destDir: string) {
  await ensureDir(destDir);

  const ftpClient = new FtpClient();

  await ftpClient.access({ host: 'ftp.datasus.gov.br', secure: false });

  await ftpClient.downloadTo(
    path.join(destDir, filename),
    `/dissemin/publicos/SIASUS/200801_/Dados/${filename}`,
  );

  return ftpClient.close();
}
