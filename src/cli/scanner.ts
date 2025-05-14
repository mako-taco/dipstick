import { Project } from "ts-morph";

export type FoundType =
  | {
      kind: "module";
      filePath: string;
      interfaceName: string;
      dependencies: string[];
    }
  | {
      kind: "component";
      filePath: string;
      interfaceName: string;
      dependencies: string[];
    };

export function scanForModules(
  tsConfigFilePath: string,
  verbose = false
): FoundType[] {
  const project = new Project({ tsConfigFilePath });
  const found: FoundType[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    for (const iface of sourceFile.getInterfaces()) {
      if (!iface.isExported()) continue;
      const moduleExt = iface
        .getExtends()
        .find((e) => e.getText().startsWith("Module"));
      if (moduleExt) {
        const dependencies = extractDependencies(moduleExt.getText());
        found.push({
          kind: "module",
          filePath: sourceFile.getFilePath(),
          interfaceName: iface.getName(),
          dependencies,
        });
        if (verbose) {
          console.log(
            `[scan] Found module interface: ${iface.getName()} in ${sourceFile.getFilePath()} with dependencies: [${dependencies.join(
              ", "
            )}]`
          );
        }
      }
      const componentExt = iface
        .getExtends()
        .find((e) => e.getText().startsWith("Component"));
      if (componentExt) {
        const dependencies = extractDependencies(componentExt.getText());
        found.push({
          kind: "component",
          filePath: sourceFile.getFilePath(),
          interfaceName: iface.getName(),
          dependencies,
        });
        if (verbose) {
          console.log(
            `[scan] Found component interface: ${iface.getName()} in ${sourceFile.getFilePath()} with dependencies: [${dependencies.join(
              ", "
            )}]`
          );
        }
      }
    }
  }
  return found;
}

function extractDependencies(extText: string): string[] {
  // e.g. Module<[FooModule, BarModule]> or Component<[FooModule, BarModule]>
  const match = extText.match(/\w+<\s*\[([^\]]*)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
