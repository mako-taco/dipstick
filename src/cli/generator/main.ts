// Main entry for code generation logic
import { Project } from "ts-morph";
import * as path from "path";
import { FoundType } from "../scanner";
import { checkForCircularDependencies } from "./utils";
import { generateModuleImplementation } from "./module";
import { generateComponentImplementation } from "./component";

export function generateImplementations(
  found: FoundType[],
  verbose = false,
  tsConfigPath?: string
): void {
  const modules = found.filter((f) => f.kind === "module");
  checkForCircularDependencies(modules);
  const project = tsConfigPath
    ? new Project({ tsConfigFilePath: tsConfigPath })
    : new Project();
  for (const item of found) {
    const sourceFile = project.addSourceFileAtPath(item.filePath);
    const iface = sourceFile.getInterface(item.interfaceName);
    if (!iface) continue;
    const importPath = "./" + path.basename(item.filePath, ".ts");
    const generatedFilePath = item.filePath.replace(/\.ts$/, ".generated.ts");
    if (item.kind === "module") {
      generateModuleImplementation({
        item,
        iface,
        project,
        sourceFile,
        generatedFilePath,
        verbose,
        found,
      });
    } else if (item.kind === "component") {
      generateComponentImplementation({
        item,
        iface,
        project,
        sourceFile,
        generatedFilePath,
        verbose,
        found,
      });
    }
  }
}
