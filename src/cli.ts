#!/usr/bin/env node
import { Command, Option } from 'commander';
import consola from 'consola';
import path from 'path';
import { knex } from './knex.js';
import { download } from './lib/download.js';
import { load } from './lib/load.js';
import { uncompress } from './lib/uncompress.js';
import env from './utils/env.js';
import {
  DataAlreadyExistsError,
  FileAlreadyExistsError,
  InvalidPAUFYYMMError,
} from './utils/errors.js';

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

async function etl(PAUFYYMM: string, opts: { workdir: string; override?: boolean }) {
  consola.start(`Starting ETL process for ${PAUFYYMM}...`);
  checkPAUFYYMM(PAUFYYMM);

  const destDir = path.resolve(process.cwd(), opts.workdir);
  process.stdout?.write('\n');
  consola.info(`Using workdir: ${destDir}`);
  consola.info(`Using override: ${opts.override}`);
  process.stdout?.write('\n');

  try {
    consola.info(`Downloading ${PAUFYYMM}.dbc...`);
    await download(`${PAUFYYMM}.dbc`, destDir, { override: opts.override });
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
    await uncompress(path.resolve(destDir, `${PAUFYYMM}.dbc`), {
      destDir,
      override: opts.override,
    });
    consola.info(`> uncompress finished.`);
  } catch (error) {
    if (error instanceof FileAlreadyExistsError) {
      consola.warn('> .dbf file already exists. Skipping uncompress step.');
    } else {
      throw error;
    }
  }

  try {
    consola.info(`Loading data from ${PAUFYYMM}.dbf into database...`);
    await load(path.resolve(destDir, `${PAUFYYMM}.dbf`), { override: opts.override });
    consola.info(`> load finished.`);
  } catch (error) {
    if (error instanceof DataAlreadyExistsError) {
      consola.warn('> .dbf file already loaded into database. Skipping load step.');
    } else {
      throw error;
    }
  }

  consola.success(`ETL process completed successfully for ${PAUFYYMM}.`);
}

// create CLI program
const program = new Command()
  .name('datasus')
  .description('Utilities to work with DATASUS SIASUS files')
  .configureHelp({ showGlobalOptions: true })
  .addOption(
    new Option('--workdir <dir>', 'working directory').default(env.PET_WORKDIR).env('PET_WORKDIR'),
  )
  .addOption(new Option('--override', 'overwrite current data').default(false));

// download command
program
  .command('download <PAUFYYMM>')
  .description('Download a DATASUS SIASUS .dbc file given a PAUFYYMM (e.g. PAMS2501)')

  .action(async (PAUFYYMM: string, _, cmd) => {
    checkPAUFYYMM(PAUFYYMM);

    const { override, workdir } = cmd.optsWithGlobals();

    const destDir = path.resolve(process.cwd(), workdir);

    consola.start(`Downloading ${PAUFYYMM}.dbc to ${destDir}...`);
    await download(`${PAUFYYMM}.dbc`, destDir, { override });
    consola.success(`Downloaded ${PAUFYYMM}.dbc to ${destDir}`);
  });

// uncompress command
program
  .command('uncompress <PAUFYYMM>')
  .description('Uncompress .dbc file (.dbc file should be downloaded)')
  .action(async (PAUFYYMM: string, _, cmd) => {
    checkPAUFYYMM(PAUFYYMM);

    const { override, workdir } = cmd.optsWithGlobals();

    const destDir = path.resolve(process.cwd(), workdir);

    consola.start(`Uncompressing ${PAUFYYMM}.dbc in ${destDir}...`);
    await uncompress(path.resolve(destDir, `${PAUFYYMM}.dbc`), { destDir, override });
    consola.success(`Uncompressed ${PAUFYYMM}.dbc in ${destDir}`);
  });

// load command
program
  .command('load <PAUFYYMM>')
  .description('Load data from .dbc file into database (.dbc file should be uncompressed)')
  .action(async (PAUFYYMM: string, _, cmd) => {
    checkPAUFYYMM(PAUFYYMM);

    const { override, workdir } = cmd.optsWithGlobals();

    const destDir = path.resolve(process.cwd(), workdir);

    consola.start(`Loading data from ${PAUFYYMM}.dbf into database...`);
    await load(path.resolve(destDir, `${PAUFYYMM}.dbf`), { override });
    consola.success(`Loaded data from ${PAUFYYMM}.dbf`);
  });

// etl command
program
  .command('etl <PAUFYYMM>', { isDefault: true })
  .description('Extract, Transform, Load data into database')
  .action(async (PAUFYYMM: string, _, cmd) => {
    consola.box('ETL Process Steps: Download -> Uncompress -> Load');
    await etl(PAUFYYMM, cmd.optsWithGlobals());
  });

// etl:period command
program
  .command('etl:period', { isDefault: true })
  .description('Extract, Transform, Load data into database')
  .addOption(
    new Option('--prefix <PAUF>', 'prefix for PAUFYYMM').default('PAMS').argParser((value) => {
      if (!/^PA[A-Z]{2}$/.test(value)) {
        throw new Error('Invalid prefix. Use format PAUF (e.g. PAMS)');
      }
      return value;
    }),
  )
  .addOption(
    new Option('--since <YYYYMM>', 'start date').default('200801').argParser((value) => {
      if (!/^\d{6}$/.test(value)) {
        throw new Error('Invalid since date. Use format YYYYMM (e.g. 200801)');
      }
      return value;
    }),
  )
  .addOption(
    new Option('--until <YYYYMM>', 'end date').default(
      `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    ),
  )
  .action(async (_, cmd) => {
    consola.box('ETL Process Steps: Download -> Uncompress -> Load');

    const { prefix, since, until, workdir, override } = cmd.optsWithGlobals();

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
      await etl(PAUFYYMM, { workdir, override });
    }
  });

// parse and run commands
program
  .parseAsync(process.argv)
  .catch((err) => {
    consola.error('Error executing command:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => knex.destroy());
