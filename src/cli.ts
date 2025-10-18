#!/usr/bin/env node
import { Command, Option } from 'commander';
import consola from 'consola';
import path from 'path';
import { knex } from './knex.js';
import { download } from './lib/download.js';
import { store } from './lib/store.js';
import { uncompress } from './lib/uncompress.js';
import env from './utils/env.js';

function checkPAUFYYMM(PAUFYYMM: string): void {
  const match = /^PA([A-Z]{2})(\d{2})(\d{2})$/.exec(PAUFYYMM);

  if (!match) {
    throw new Error('Invalid file. Use format PAUFYYMM (e.g. PAMS2501)');
  } else if (parseInt(match[2]) < 8) {
    throw new Error('Data before 2008 is not available for download.');
  } else if (parseInt(match[3]) < 1 || parseInt(match[3]) > 12) {
    throw new Error('Invalid month in PAUFYYMM. Month should be between 01 and 12.');
  }
}

const program = new Command();

program.name('datasus').description('Utilities to work with DATASUS SIASUS files').configureHelp();

// download command
program
  .command('download <PAUFYYMM>')
  .description('Download a DATASUS SIASUS .dbc file given a PAUFYYMM (e.g. PAMS2501)')
  .addOption(
    new Option('--workdir <dir>', 'working directory').default(env.PET_WORKDIR).env('PET_WORKDIR'),
  )
  .addOption(new Option('--force', 'override file if it exists').default(false))
  .action(async (PAUFYYMM: string, options: { workdir: string; force: boolean }) => {
    checkPAUFYYMM(PAUFYYMM);

    const destDir = path.resolve(process.cwd(), options.workdir);

    consola.start(`Downloading ${PAUFYYMM}.dbc to ${destDir}...`);
    await download(`${PAUFYYMM}.dbc`, destDir);
    consola.success(`Downloaded ${PAUFYYMM}.dbc to ${destDir}`);
  });

// uncompress command
program
  .command('uncompress <PAUFYYMM>')
  .description('Uncompress .dbc file (.dbc file should be downloaded)')
  .addOption(
    new Option('--workdir <dir>', 'working directory').default(env.PET_WORKDIR).env('PET_WORKDIR'),
  )
  .addOption(new Option('-f, --force', 'force reload / overwrite').default(false))
  .action(async (PAUFYYMM: string, options: { workdir: string; force: boolean }) => {
    checkPAUFYYMM(PAUFYYMM);

    const destDir = path.resolve(process.cwd(), options.workdir);

    consola.start(`Uncompressing ${PAUFYYMM}.dbc in ${destDir}...`);
    await uncompress(path.resolve(destDir, `${PAUFYYMM}.dbc`));
    consola.success(`Uncompressed ${PAUFYYMM}.dbc in ${destDir}`);
  });

// store command
program
  .command('store <PAUFYYMM>')
  .description('Store data from .dbc file into database (.dbc file should be uncompressed)')
  .addOption(
    new Option('--workdir <dir>', 'working directory').default(env.PET_WORKDIR).env('PET_WORKDIR'),
  )
  .addOption(new Option('-f, --force', 'force reload / overwrite').default(false))
  .action(async (PAUFYYMM: string, options: { workdir: string; force: boolean }) => {
    checkPAUFYYMM(PAUFYYMM);

    const destDir = path.resolve(process.cwd(), options.workdir);

    consola.start(`Storing data from ${PAUFYYMM}.dbc in ${destDir}...`);
    await store(path.resolve(destDir, `${PAUFYYMM}.dbf`));
    consola.success(`Stored data from ${PAUFYYMM}.dbc in ${destDir}`);
  });

// parse and run commands
program
  .parseAsync(process.argv)
  .catch((err) => {
    consola.error('Error executing command:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => knex.destroy());
