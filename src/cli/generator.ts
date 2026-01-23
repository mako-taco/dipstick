import {
  ClassDeclarationStructure,
  OptionalKind,
  Project,
  SourceFile,
} from 'ts-morph';

import { ILogger } from './logger';
import { moduleToClassDecl } from './utils/generator/module-to-class-decl';
import { ProcessedContainer, ProcessedContainerGroup } from './types';

export class Generator {
  constructor(
    private readonly project: Project,
    private readonly logger: ILogger
  ) {}

  public generateFile(
    moduleGroup: ProcessedContainerGroup,
    allContainers: Map<string, ProcessedContainer>
  ): SourceFile {
    this.logger.info(`Generating file ${moduleGroup.filePath}`);
    const existingFile = this.project.getSourceFile(moduleGroup.filePath);
    if (existingFile) this.project.removeSourceFile(existingFile);
    const outputFile = this.project.createSourceFile(
      moduleGroup.filePath,
      undefined,
      { overwrite: true }
    );

    moduleGroup.imports.forEach(moduleGroupImport => {
      outputFile.addImportDeclaration({
        ...moduleGroupImport,
      });
    });

    const classDecls = moduleGroup.modules.map<
      OptionalKind<ClassDeclarationStructure>
    >(moduleToClassDecl(this.logger, allContainers));

    this.logger.info(`↳ Adding ${classDecls.length} classes to file`);
    classDecls.forEach(classDecl => {
      this.logger.info(
        `  ↳ ${classDecl.name} (${classDecl.methods?.length} methods)`
      );
    });
    outputFile.addClasses(classDecls);

    outputFile
      .organizeImports()
      .fixUnusedIdentifiers()
      .formatText({ ensureNewLineAtEndOfFile: true });

    return outputFile;
  }
}
