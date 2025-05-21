import {
  Project,
  TypeAliasDeclaration,
  TypeReferenceNode,
  Node,
} from "ts-morph";
import { ILogger } from "./logger";

export interface FoundModule {
  name: string;
  filePath: string;
  typeAlias: TypeAliasDeclaration;
}

export interface IScanner {
  scan(): FoundModule[];
}

export class Scanner implements IScanner {
  constructor(
    private readonly project: Project,
    private readonly logger: ILogger
  ) {}
  scan(): FoundModule[] {
    const sourceFiles = this.project.getSourceFiles();
    const foundModules: FoundModule[] = [];

    for (const sourceFile of sourceFiles) {
      // Skip declaration files and node_modules
      if (
        sourceFile.isDeclarationFile() ||
        sourceFile.getFilePath().includes("node_modules")
      ) {
        continue;
      }

      const dipstickImport = sourceFile.getImportDeclaration("dipstick");
      if (!dipstickImport) {
        this.logger.debug(
          `Skipping ${sourceFile.getFilePath()}: (No dipstick import found)`
        );
        continue;
      }

      const namespaceImport = dipstickImport
        .getNamedImports()
        .find((ni) => ni.getName() === "dip");
      if (!namespaceImport) {
        this.logger.debug(
          `Skipping ${sourceFile.getFilePath()}: (No dip namespace import found)`
        );
        continue;
      }

      // Get all type aliases in the file
      const typeAliases = sourceFile.getTypeAliases();

      for (const typeAlias of typeAliases) {
        const typeNode = typeAlias.getTypeNode();

        // Check if this is a type reference (e.g., dip.Module<...>)
        if (typeNode && Node.isTypeReference(typeNode)) {
          const typeName = typeNode.getTypeName().getText();

          // Check if it's a dip.Module type
          if (typeName === "dip.Module") {
            // Skip non-exported type aliases
            if (!typeAlias.isExported()) {
              this.logger.debug(
                `Skipping ${sourceFile.getFilePath()} ${typeAlias.getName()}: (Not exported)`
              );
              continue;
            }
            this.logger.log(
              `Found module ${typeAlias.getName()} in ${sourceFile.getFilePath()}`
            );
            foundModules.push({
              name: typeAlias.getName(),
              filePath: sourceFile.getFilePath(),
              typeAlias,
            });
          }
        }
      }
    }

    return foundModules;
  }
}
