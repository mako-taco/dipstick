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
  .option('-v --verbose', 'Enable verbose logging')
  .action(
    async ({ tsconfig, verbose }: { tsconfig: string; verbose: boolean }) => {
      const project = new Project({
        tsConfigFilePath: tsconfig,
      });
      const logger = new Logger(verbose);
      const generator = new Generator(project, logger);
      const scanner = new Scanner(project, logger);

      const modules = scanner.findModules();
      const fileEmitPromises = modules.map(module =>
        generator.generateFile(module).emit()
      );

      await Promise.all(fileEmitPromises);
    }
  );

program.parse();
