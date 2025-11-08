import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';

type UnzipFn = ((zippath: string, destpath: string) => Promise<void>) & {
  single: (zippath: string, filename: string, destpath: string) => Promise<void>;
};

export const unzip: UnzipFn = async (zippath, destpath): Promise<void> => {
  return new Promise((resolve, reject) => {
    yauzl.open(zippath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);

      zipfile.readEntry();

      zipfile.on('entry', (entry: yauzl.Entry) => {
        const entryPath = path.join(destpath, entry.fileName);

        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          fs.mkdirSync(entryPath, { recursive: true });
          zipfile.readEntry();
        } else {
          // File entry
          fs.mkdirSync(path.dirname(entryPath), { recursive: true });

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err || !readStream) return reject(err);

            const writeStream = fs.createWriteStream(entryPath);
            readStream.pipe(writeStream);

            writeStream.on('close', () => zipfile.readEntry());
            readStream.on('error', reject);
            writeStream.on('error', reject);
          });
        }
      });

      zipfile.once('end', () => resolve());
      zipfile.once('error', reject);
    });
  });
};

unzip.single = (zippath, filename, destpath) => {
  return new Promise<void>((resolve, reject) => {
    yauzl.open(zippath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (entry.fileName.toLowerCase() === filename.toLowerCase()) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);
            readStream.pipe(fs.createWriteStream(destpath));
            readStream.on('end', () => zipfile.close());
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('close', () => {
        resolve();
      });

      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
};
