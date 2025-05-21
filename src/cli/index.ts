#!/usr/bin/env node

import { Command } from "commander";
import { generate } from "./commands/generate";

const program = new Command();

program
  .command("generate")
  .description("Generate dependency injection code from TypeScript files")
  .argument("<tsconfig>", "Path to tsconfig.json file")
  .option("-v --verbose", "Enable verbose logging")
  .action(generate);

program.parse();
