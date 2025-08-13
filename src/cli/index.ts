#!/usr/bin/env node

import { Command } from 'commander';
import { Generator } from './generator';
import { Project } from 'ts-morph';
import { Logger } from './logger';
import { Scanner } from './scanner';

const program = new Command();

program
  .command('generate')
  .description('Generate dependency injection code from TypeScript files')
  .argument('<tsconfig>', 'Path to tsconfig.json file')
  .option(
    '-i --include <glob>',
    'Include only files matching this glob pattern when scanning for containers'
  )
  .option('-v --verbose', 'Enable verbose logging')
  .action(
    async (
      tsconfig: string,
      { verbose, include }: { verbose: boolean; include?: string }
    ) => {
      const project = new Project({
        tsConfigFilePath: tsconfig,
      });
      const logger = new Logger(verbose);
      const generator = new Generator(project, logger);
      const scanner = new Scanner(project, logger);

      logger.info(`Scanning for modules in ${tsconfig}...`);

      const moduleGroups = scanner.findContainers(include);

      logger.info(`↳ Found ${moduleGroups.length} files with modules in them.`);

      const fileEmitPromises = moduleGroups.map(module =>
        generator.generateFile(module).save()
      );

      await Promise.all(fileEmitPromises);
    }
  );

program.parse();
