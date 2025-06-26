import {
  ClassDeclarationStructure,
  OptionalKind,
  Project,
  SourceFile,
} from "ts-morph";

import { ILogger } from "./logger";
import { moduleToClassDecl } from "./utils/generator/module-to-class-decl";
import { ProcessedModuleGroup } from "./types";

export class Generator {
  constructor(
    private readonly project: Project,
    private readonly logger: ILogger
  ) {}

  public generateFile(moduleGroup: ProcessedModuleGroup): SourceFile {
    const existingFile = this.project.getSourceFile(moduleGroup.filePath);
    if (existingFile) this.project.removeSourceFile(existingFile);
    const outputFile = this.project.createSourceFile(
      moduleGroup.filePath,
      undefined,
      { overwrite: true }
    );

    moduleGroup.imports.forEach((moduleGroupImport) => {
      outputFile.addImportDeclaration({
        ...moduleGroupImport,
      });
    });

    const classDecls =
      moduleGroup.modules.map<OptionalKind<ClassDeclarationStructure>>(
        moduleToClassDecl
      );

    outputFile.addClasses(classDecls);

    outputFile
      .organizeImports()
      .fixUnusedIdentifiers()
      .formatText({ ensureNewLineAtEndOfFile: true });

    return outputFile;
  }
}
