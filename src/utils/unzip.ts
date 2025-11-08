import extract from 'extract-zip';
import fs from 'fs';
import yauzl from 'yauzl';

type UnzipFn = ((zippath: string, destpath: string) => Promise<void>) & {
  single: (zippath: string, filename: string, destpath: string) => Promise<void>;
};

export const unzip: UnzipFn = async (zippath, destpath): Promise<void> => {
  return extract(zippath, { dir: destpath });
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
