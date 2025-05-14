#!/usr/bin/env node
import { Command } from "commander";
import { scanForModules } from "./scanner";
import { generateImplementations } from "./generator/main";

const program = new Command();

program
  .name("codegen")
  .description("Generate DI module implementations")
  .version("0.1.0");

program
  .argument("<tsconfig>", "Path to tsconfig.json to use for file inclusion")
  .option("-v, --verbose", "Enable verbose logging")
  .action((tsconfig: string, options: { verbose?: boolean }) => {
    const foundModules = scanForModules(tsconfig, options.verbose);
    generateImplementations(foundModules, options.verbose, tsconfig);
  });

program.parse(process.argv);
