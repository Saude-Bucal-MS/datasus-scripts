#!/usr/bin/env node
import { Command, Option } from 'commander';
import consola from 'consola';
import path from 'path';
import { dirSync } from 'tmp';
import { download } from './lib/download.js';
import { transform } from './lib/transform.js';
import { uncompress } from './lib/uncompress.js';
import {
  DataAlreadyExistsError,
  FileAlreadyExistsError,
  InvalidPAUFYYMMError,
} from './utils/errors.js';
import { fileExists, mvFile } from './utils/fs.js';

function checkPAUFYYMM(PAUFYYMM: string): void {
  const match = /^PA([A-Z]{2})(\d{2})(\d{2})$/.exec(PAUFYYMM);

  if (!match) {
    throw new InvalidPAUFYYMMError('Invalid file. Use format PAUFYYMM (e.g. PAMS2501)');
  } else if (parseInt(match[2]) < 8) {
    throw new InvalidPAUFYYMMError('Data before 2008 is not available for download.');
  } else if (parseInt(match[3]) < 1 || parseInt(match[3]) > 12) {
    throw new InvalidPAUFYYMMError('Invalid month in PAUFYYMM. Month should be between 01 and 12.');
  }
}

async function exec(
  PAUFYYMM: string,
  opts: { workdir: string; override?: boolean; keepFiles?: boolean },
): Promise<void> {
  consola.start(`Starting ETL process for ${PAUFYYMM}...`);
  checkPAUFYYMM(PAUFYYMM);

  const tmpDir = dirSync({ prefix: 'datasus-', unsafeCleanup: true });

  process.stdout?.write('\n');
  consola.info(`Using workdir: ${opts.workdir}`);
  consola.info(`Using override: ${opts.override}`);
  consola.info(`Using keep-files: ${opts.keepFiles}`);
  consola.info(`Using temp dir: ${tmpDir.name}`);
  process.stdout?.write('\n');

  const destDir = path.resolve(process.cwd(), opts.workdir);
  const tmpDestDir = path.resolve(process.cwd(), tmpDir.name);

  if (fileExists(path.resolve(destDir, `${PAUFYYMM}.sqlite`)) && !opts.override) {
    consola.warn(`> SQLite database for ${PAUFYYMM} already exists. Skipping ETL process.`);
    return;
  }

  try {
    consola.info(`Downloading ${PAUFYYMM}.dbc...`);
    await download(`${PAUFYYMM}.dbc`, tmpDestDir, { override: opts.override });
    consola.info(`> download finished.`);
  } catch (error) {
    if (error instanceof FileAlreadyExistsError) {
      consola.warn('> .dbc file already exists. Skipping download step.');
    } else {
      throw error;
    }
  }

  try {
    consola.info(`Uncompressing ${PAUFYYMM}.dbc...`);
    await uncompress(path.resolve(tmpDestDir, `${PAUFYYMM}.dbc`), { override: opts.override });
    consola.info(`> uncompress finished.`);
  } catch (error) {
    if (error instanceof FileAlreadyExistsError) {
      consola.warn('> .dbf file already exists. Skipping uncompress step.');
    } else {
      throw error;
    }
  }

  try {
    consola.info(`Transforming ${PAUFYYMM}.dbf into a sqlite database...`);
    await transform(path.resolve(tmpDestDir, `${PAUFYYMM}.dbf`), { override: opts.override });
    consola.info(`> transform finished.`);
  } catch (error) {
    if (error instanceof DataAlreadyExistsError) {
      consola.warn('> .dbf file already transformed. Skipping load step.');
    } else {
      throw error;
    }
  }

  mvFile(
    path.resolve(tmpDestDir, `${PAUFYYMM}.sqlite`),
    path.resolve(destDir, `${PAUFYYMM}.sqlite`),
  );

  if (opts.keepFiles) {
    mvFile(path.resolve(tmpDestDir, `${PAUFYYMM}.dbc`), path.resolve(destDir, `${PAUFYYMM}.dbc`));
    mvFile(path.resolve(tmpDestDir, `${PAUFYYMM}.dbf`), path.resolve(destDir, `${PAUFYYMM}.dbf`));
  }

  tmpDir.removeCallback();

  consola.success(`ETL process completed successfully for ${PAUFYYMM}.`);
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
  .command('single <PAUFYYMM>', { isDefault: true })
  .description('Download, uncompress and transform a single PAUFYYMM file')
  .action(async (PAUFYYMM: string, _, cmd) => {
    consola.box('Steps: Download -> Uncompress -> Transform');
    await exec(PAUFYYMM, cmd.optsWithGlobals());
  });

// period command
program
  .command('period', { isDefault: true })
  .description('Download, uncompress and transform PAUFYYMM files in a given period')
  .addOption(
    new Option('--prefix <PAUF>', 'prefix for PAUFYYMM').default('PAMS').argParser((value) => {
      if (!/^PA[A-Z]{2}$/.test(value)) {
        throw new Error('Invalid prefix. Use format PAUF (e.g. PAMS)');
      }
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
          throw new Error('Invalid since date. Use format YYYYMM (e.g. 200801)');
        }
        return value;
      }),
  )
  .action(async (_, cmd) => {
    consola.box('Steps: Download -> Uncompress -> Transform');

    const { prefix, since, until, ...etlOpts } = cmd.optsWithGlobals();

    const inc = (YYYYMM: string): string => {
      let year = parseInt(YYYYMM.slice(0, 4), 10);
      let month = parseInt(YYYYMM.slice(4, 6), 10);

      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }

      return `${year}${String(month).padStart(2, '0')}`;
    };

    for (let date = since; date <= until; date = inc(date)) {
      const YY = date.slice(2, 4);
      const MM = date.slice(4, 6);
      const PAUFYYMM = `${prefix}${YY}${MM}`;
      await exec(PAUFYYMM, etlOpts);
    }
  });

// parse and run commands
program.parseAsync(process.argv).catch((err) => {
  consola.error('Error executing command:', err instanceof Error ? err.message : err);
  process.exit(1);
});
