import { Project } from "ts-morph";
import { resolve } from "path";
import { Logger } from "../logger";
import { FoundModule, Scanner } from "../scanner";
import { generateFile } from "../generator/generateFile";

interface GenerateOptions {
  verbose?: boolean;
}

export async function generate(tsconfigPath: string, options: GenerateOptions) {
  const resolvedTsConfigPath = resolve(process.cwd(), tsconfigPath);
  const logger = new Logger(options.verbose ?? false);

  logger.log(`Using tsconfig at: ${resolvedTsConfigPath}`);

  // Initialize ts-morph project
  const project = new Project({
    tsConfigFilePath: resolvedTsConfigPath,
  });

  const scanner = new Scanner(project, logger);
  const modules = scanner.scan();

  // Group modules by file path
  const modulesByFile = groupModulesByFilePath(modules);
  logger.log(`Found ${modules.length} modules in ${modulesByFile.size} files.`);

  const promises = [];
  for (const [filePath, modules] of modulesByFile.entries()) {
    // Validate file extension and create generated file path
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
      throw new Error(
        `Invalid file extension for module file: ${filePath}. Expected .ts or .tsx`
      );
    }

    const generatedPath = filePath.replace(/(\.tsx)$/, ".gen$1");
    const generatedFile = generateFile({
      project,
      path: generatedPath,
      modules,
      sourceFile: project.getSourceFileOrThrow(filePath),
      logger,
    });

    logger.log(`Generating file: ${generatedPath}`);
    promises.push(generatedFile.save());
  }

  await Promise.allSettled(promises);
}

function groupModulesByFilePath(
  modules: FoundModule[]
): Map<string, Omit<FoundModule, "filePath">[]> {
  return modules.reduce((acc, module) => {
    const filePath = module.filePath;
    if (!acc.get(filePath)) {
      acc.set(filePath, []);
    }
    acc.get(filePath)!.push(module);
    return acc;
  }, new Map<string, Omit<FoundModule, "filePath">[]>());
}
