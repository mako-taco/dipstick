#!/usr/bin/env node

import { Command } from 'commander';
import { Generator } from './generator';
import { Project } from 'ts-morph';
import { Logger } from './logger';
import { Scanner } from './scanner';
import { ProcessedContainer } from './types';

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
      const logger = new Logger(verbose);
      logger.debug('[DEBUG] Starting dipstick generate...');
      const project = new Project({
        tsConfigFilePath: tsconfig,
      });
      logger.debug('[DEBUG] Project created');
      const generator = new Generator(project, logger);
      const scanner = new Scanner(project, logger);

      logger.info(`Scanning for modules in ${tsconfig}...`);
      logger.debug('[DEBUG] About to call scanner.findContainers...');

      const moduleGroups = scanner.findContainers(include);

      logger.debug(
        `[DEBUG] Scanner finished, found ${moduleGroups.length} module groups`
      );
      logger.info(`↳ Found ${moduleGroups.length} files with modules in them.`);

      // Build a map of all processed containers by name
      const allContainers = new Map<string, ProcessedContainer>();
      for (const group of moduleGroups) {
        for (const container of group.modules) {
          allContainers.set(container.name, container);
        }
      }
      logger.debug(`[DEBUG] Built map of ${allContainers.size} containers`);

      logger.debug('[DEBUG] About to generate files...');
      const fileEmitPromises = moduleGroups.map((module, idx) => {
        logger.debug(
          `[DEBUG] Generating file ${idx + 1}/${moduleGroups.length}: ${module.filePath}`
        );
        const result = generator.generateFile(module, allContainers);
        logger.debug(`[DEBUG] Generated file ${idx + 1}, about to save...`);
        return result.save().then(() => {
          logger.debug(`[DEBUG] Saved file ${idx + 1}`);
        });
      });

      logger.debug('[DEBUG] Waiting for all files to save...');
      await Promise.all(fileEmitPromises);
      logger.debug('[DEBUG] All files saved, done!');
    }
  );

program.parse();
