#!/usr/bin/env node
import { Command, Option } from 'commander';
import consola from 'consola';
import path from 'path';
import { download } from './lib/download.js';
import { uncompress } from './lib/uncompress.js';
import env from './utils/env.js';

const program = new Command();

program.name('datasus').description('Utilities to work with DATASUS SIASUS files').configureHelp();

// download command
program
  .command('download <yymm>')
  .description('Download a DATASUS SIASUS .dbc file given a YYMM (e.g. 2401)')
  .addOption(
    new Option('--workdir <dir>', 'working directory').default(env.PET_WORKDIR).env('PET_WORKDIR'),
  )
  .addOption(new Option('--force', 'override file if it exists').default(false))
  .action(async (yymm: string, options: { workdir: string; force: boolean }) => {
    if (!yymm || !/^\d{4}$/.test(yymm)) {
      consola.error('Invalid date. Use format YYMM (e.g. 2401)');
      process.exit(2);
    }

    const destDir = path.resolve(process.cwd(), options.workdir);

    try {
      consola.start(`Downloading PAMS${yymm}.dbc to ${destDir}...`);
      await download(`PAMS${yymm}.dbc`, destDir);
      consola.success(`Downloaded PAMS${yymm}.dbc to ${destDir}`);
    } catch (err) {
      consola.error('Error downloading file:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// uncompress command (TODO)
program
  .command('uncompress <yymm>')
  .description('Uncompress .dbc file (.dbc file should be downloaded)')
  .addOption(
    new Option('--workdir <dir>', 'working directory').default(env.PET_WORKDIR).env('PET_WORKDIR'),
  )
  .addOption(new Option('-f, --force', 'force reload / overwrite').default(false))
  .action(async (yymm: string, options: { workdir: string; force: boolean }) => {
    if (!yymm || !/^\d{4}$/.test(yymm)) {
      consola.error('Invalid date. Use format YYMM (e.g. 2401)');
      process.exit(2);
    }

    const destDir = path.resolve(process.cwd(), options.workdir);

    consola.start(`Uncompressing PAMS${yymm}.dbc in ${destDir}...`);
    await uncompress(path.resolve(destDir, `PAMS${yymm}.dbc`));
    consola.success(`Uncompressed PAMS${yymm}.dbc in ${destDir}`);
  });

// parse and run commands
program.parseAsync(process.argv).catch((err) => {
  consola.error('Error executing command:', err instanceof Error ? err.message : err);
  process.exit(1);
});
