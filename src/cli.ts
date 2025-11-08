#!/usr/bin/env node
import { Command, Option } from 'commander';
import consola from 'consola';
import PQueue from 'p-queue';
import path from 'path';
import { dirSync } from 'tmp';
import { DownloadFn, ftpDownloader } from './lib/download.js';
import { TransformFn, transformPA, transformPOP } from './lib/transform.js';
import { UncompressFn, uncompressDBC, uncompressPopZIP } from './lib/uncompress.js';
import {
  DataAlreadyExistsError,
  FileAlreadyExistsError,
  InvalidPatternError,
} from './utils/errors.js';
import { ensureDir, fileExists, mvFile } from './utils/fs.js';

function checkFormat(pattern: string): 'PA' | 'POPSBR' | never {
  if (pattern.startsWith('PA')) {
    const match = /^PA([A-Z]{2})(\d{2})(\d{2})$/.exec(pattern);

    if (!match) {
      throw new InvalidPatternError('Invalid file. Use format PAUFYYMM (e.g. PAMS2501)');
    } else if (parseInt(match[2]) < 8) {
      throw new InvalidPatternError('Data before 2008 is not available for download.');
    } else if (parseInt(match[3]) < 1 || parseInt(match[3]) > 12) {
      throw new InvalidPatternError(
        'Invalid month in PAUFYYMM. Month should be between 01 and 12.',
      );
    }
    return 'PA';
  } else if (pattern.startsWith('POPSBR')) {
    const match = /^POPSBR(\d{2})$/.exec(pattern);

    if (!match) {
      throw new InvalidPatternError('Invalid file. Use format POPSBRYY (e.g. POPSBR25)');
    } else if (parseInt(match[1]) < 0) {
      throw new InvalidPatternError('Data before 2000 is not available for download.');
    }
    return 'POPSBR';
  } else {
    throw new InvalidPatternError('Invalid pattern. Use PAUFYYMM or POPSBRYY format.');
  }
}

type ExecOpts = { workdir: string; override?: boolean; keepFiles?: boolean };

async function exec(pattern: string, opts: ExecOpts): Promise<void> {
  consola.start(`Starting ETL process for ${pattern}...`);

  let filename: string;
  let downloader: DownloadFn;
  let uncompressor: UncompressFn;
  let transformer: TransformFn;

  switch (checkFormat(pattern)) {
    case 'PA':
      filename = `${pattern}.dbc`;
      downloader = ftpDownloader;
      uncompressor = uncompressDBC;
      transformer = transformPA;
      break;
    case 'POPSBR':
      filename = `${pattern}.zip`;
      downloader = ftpDownloader;
      uncompressor = uncompressPopZIP;
      transformer = transformPOP;
      break;
  }

  const tmpDir = dirSync({ prefix: 'datasus-', unsafeCleanup: true });

  process.stdout?.write('\n');
  consola.info(`Using workdir: ${opts.workdir}`);
  consola.info(`Using override: ${opts.override}`);
  consola.info(`Using keep-files: ${opts.keepFiles}`);
  consola.info(`Using temp dir: ${tmpDir.name}`);
  process.stdout?.write('\n');

  const destDir = path.resolve(process.cwd(), opts.workdir);
  const tmpDestDir = path.resolve(process.cwd(), tmpDir.name);

  if (fileExists(path.resolve(destDir, `${pattern}.sqlite`)) && !opts.override) {
    consola.warn(`> SQLite database for ${pattern} already exists. Skipping ETL process.`);
    return;
  }

  let downloadPath!: string;
  try {
    consola.info(`Downloading ${pattern}.dbc...`);
    downloadPath = await downloader(filename, tmpDestDir, { override: opts.override });
    consola.info(`> download finished.`);
  } catch (error) {
    if (error instanceof FileAlreadyExistsError) {
      consola.warn('> .dbc file already exists. Skipping download step.');
    } else {
      throw error;
    }
  }

  let uncompressPath!: string;
  try {
    consola.info(`Uncompressing ${pattern}.dbc...`);
    uncompressPath = await uncompressor(downloadPath, { override: opts.override });
    consola.info(`> uncompress finished.`);
  } catch (error) {
    if (error instanceof FileAlreadyExistsError) {
      consola.warn('> .dbf file already exists. Skipping uncompress step.');
    } else {
      throw error;
    }
  }

  let transformedPath!: string;
  try {
    consola.info(`Transforming ${pattern}.dbf into a sqlite database...`);
    transformedPath = await transformer(uncompressPath, { override: opts.override });
    consola.info(`> transform finished.`);
  } catch (error) {
    if (error instanceof DataAlreadyExistsError) {
      consola.warn('> .dbf file already transformed. Skipping load step.');
    } else {
      throw error;
    }
  }

  ensureDir(destDir);

  mvFile(transformedPath, path.resolve(destDir, path.basename(transformedPath)));

  if (opts.keepFiles) {
    mvFile(downloadPath, path.resolve(destDir, path.basename(downloadPath)));
    mvFile(uncompressPath, path.resolve(destDir, path.basename(uncompressPath)));
  }

  tmpDir.removeCallback();

  consola.success(`ETL process completed successfully for ${pattern}.`);
}

// create CLI program
const program = new Command()
  .name('datasus')
  .description('Utilities to work with DATASUS SIASUS files')
  .configureHelp({ showGlobalOptions: true })
  .addOption(
    new Option('--workdir <dir>', 'working directory').default('./data').env('PET_WORKDIR'),
  )
  .addOption(new Option('--override', 'overwrite current data').default(false))
  .addOption(new Option('--keep-files', 'keep intermediate files').default(false));

// single command
program
  .command('single <PAUFYYMM|POPSBRYY>', { isDefault: true })
  .description('Download, uncompress and transform a single <PAUFYYMM|POPSBRYY> file')
  .action(async (pattern: string, _, cmd) => {
    consola.box('Steps: Download -> Uncompress -> Transform');
    await exec(pattern, cmd.optsWithGlobals()).catch((err) => {
      if (err.code === 550)
        return consola.warn(`Data for ${pattern} not found on server. Skipping.`);
      throw err;
    });
  });

// period command
program
  .command('period', { isDefault: true })
  .description('Download, uncompress and transform <PAUFYYMM|POPSBRYY> files in a given period')
  .addOption(
    new Option('--prefix <PAUF|POPSBR>', 'prefix for <PAUFYYMM|POPSBRYY>')
      .default('PAMS')
      .argParser((value) => {
        if (!/^PA[A-Z]{2}|POPSBR$/g.test(value))
          throw new Error('Invalid prefix. Use PAUF or POPSBR.');
        return value;
      }),
  )
  .addOption(
    new Option('--since <YYYYMM>', 'start date')
      .default(`${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`)
      .argParser((value) => {
        if (!/^\d{6}$/.test(value)) {
          throw new Error('Invalid since date. Use format YYYYMM (e.g. 200801)');
        }
        return value;
      }),
  )
  .addOption(
    new Option('--until <YYYYMM>', 'end date')
      .default(`${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`)
      .argParser((value) => {
        if (!/^\d{6}$/.test(value)) {
          throw new Error('Invalid until date. Use format YYYYMM (e.g. 202512)');
        }
        return value;
      }),
  )
  .addOption(
    new Option('--concurrency <number>', 'number of concurrent downloads')
      .default(1)
      .argParser((value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 1) {
          throw new Error('Concurrency must be a positive integer.');
        }
        return parsed;
      }),
  )
  .action(async (_, cmd) => {
    consola.box('Steps: Download -> Uncompress -> Transform');

    const { prefix, since, until, concurrency, ...etlOpts } = cmd.optsWithGlobals();

    const inc = (YYYYMM: string): string => {
      let year = parseInt(YYYYMM.slice(0, 4), 10);
      let month = parseInt(YYYYMM.slice(4, 6), 10);

      month += 1;
      if (prefix === 'POPSBR' || month > 12) {
        month = 1;
        year += 1;
      }

      return `${year}${String(month).padStart(2, '0')}`;
    };

    const queue = new PQueue({ concurrency });

    for (let date = since; date <= until; date = inc(date)) {
      const YY = date.slice(2, 4);
      const MM = date.slice(4, 6);

      let pattern!: string;
      if (prefix === 'PAMS') pattern = `${prefix}${YY}${MM}`;
      else if (prefix === 'POPSBR') pattern = `${prefix}${YY}`;
      else throw new Error(`Invalid prefix: ${prefix}`);

      queue.add(() =>
        exec(pattern, etlOpts).catch((err) => {
          if (err.code === 550)
            return consola.warn(`Data for ${pattern} not found on server. Skipping.`);
          throw err;
        }),
      );
    }

    await queue.onIdle();

    consola.success('ETL process completed successfully for all files in the given period.');
  });

// parse and run commands
program
  .parseAsync(process.argv)
  .then(() => process.exit(0))
  .catch((err) => {
    consola.error('Error executing command:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
