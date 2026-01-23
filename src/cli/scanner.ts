import {
  Project,
  Node,
  SyntaxKind,
  SourceFile,
  TypeAliasDeclaration,
} from 'ts-morph';
import { ILogger } from './logger';
import {
  FoundContainer,
  Binding,
  ProcessedDependency,
  ProcessedContainer,
  ProcessedContainerGroup,
  ProcessedContainerGroupImport,
} from './types';
import { foundContainerToProcessedDependencies } from './utils/scanner/process-deps/process-deps';
import { foundContainerToProcessedBindings } from './utils/scanner/process-bindings/foundContainerToProcessedBindings';
import { isMatch } from 'micromatch';

export class Scanner {
  constructor(
    private readonly project: Project,
    private readonly logger: ILogger
  ) {}

  private logSkipped(nodeOrSourceFile: Node | SourceFile, message: string) {
    const location = nodeOrSourceFile.isKind(SyntaxKind.SourceFile)
      ? nodeOrSourceFile.getFilePath()
      : `${nodeOrSourceFile
          .getSourceFile()
          .getFilePath()}:${nodeOrSourceFile.getStartLineNumber()}:${nodeOrSourceFile.getStartLinePos()}`;
    this.logger.debug(`Skipping ${location} | ${message}`);
  }

  public findContainers(include?: string): ProcessedContainerGroup[] {
    this.logger.info(`Scanning for containers in ${include ?? 'all files'}`);
    const matchesInclude = (filePath: string): boolean => {
      return (
        include === undefined || isMatch(filePath, include, { matchBase: true })
      );
    };
    const sourceFiles = this.project
      .getSourceFiles()
      .filter(file => matchesInclude(file.getFilePath()));
    const foundContainers: FoundContainer[] = sourceFiles
      .flatMap(sourceFile => this.findContainersInSourceFile(sourceFile))
      .filter(m => m !== null);

    const byFilePath = this.groupContainersByFilePath(foundContainers);

    return Array.from(byFilePath.entries()).map(
      ([filePath, modules]: [string, FoundContainer[]]) => {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
          throw new Error(
            `Invalid file extension for module file: ${filePath}. Expected .ts or .tsx`
          );
        }

        const generatedFilePath = filePath.replace(/(\.tsx|\.ts)$/, '.gen$1');
        const generatedSourceFile =
          this.project.getSourceFile(generatedFilePath) ??
          this.project.createSourceFile(generatedFilePath);

        const sourceFile = this.project.getSourceFileOrThrow(filePath);
        const imports: ProcessedContainerGroupImport[] = sourceFile
          .getImportDeclarations()
          .map(sourceImport => ({
            namedImports: sourceImport.getNamedImports().map(ni => {
              return {
                name: ni.getName(),
                isTypeOnly: ni.isTypeOnly(),
              };
            }),
            moduleSpecifier: sourceImport.getModuleSpecifier().getLiteralText(),
          }))
          .concat([
            {
              namedImports: sourceFile.getExportSymbols().map(e => {
                return {
                  name: e.getName(),
                  isTypeOnly: false,
                };
              }),
              moduleSpecifier:
                generatedSourceFile.getRelativePathAsModuleSpecifierTo(
                  sourceFile
                ),
            },
          ]);

        return {
          sourceFilePath: filePath,
          filePath: generatedFilePath,
          modules: modules.map(module => this.processContainer(module)),
          imports,
        };
      }
    );
  }
  private processContainer(module: FoundContainer): ProcessedContainer {
    this.logger.debug(`[DEBUG] Processing container: ${module.name}`);
    this.logger.debug(`[DEBUG] ↳ Getting dependencies...`);
    const dependencies: ProcessedDependency[] =
      foundContainerToProcessedDependencies(module);
    this.logger.debug(`[DEBUG] ↳ Found ${dependencies.length} dependencies`);
    this.logger.debug(`[DEBUG] ↳ Getting bindings...`);
    const bindings: Binding[] = foundContainerToProcessedBindings(this.logger)(
      module
    );
    this.logger.debug(`[DEBUG] ↳ Found ${bindings.length} bindings`);

    return {
      name: module.name,
      dependencies,
      bindings,
    };
  }

  private groupContainersByFilePath(
    modules: FoundContainer[]
  ): Map<string, FoundContainer[]> {
    return modules.reduce((acc, module) => {
      const filePath = module.filePath;
      if (!acc.get(filePath)) {
        acc.set(filePath, []);
      }
      acc.get(filePath)!.push(module);
      return acc;
    }, new Map<string, FoundContainer[]>());
  }

  private findContainersInSourceFile(sourceFile: SourceFile): FoundContainer[] {
    // Skip declaration files and node_modules
    if (
      sourceFile.isDeclarationFile() ||
      sourceFile.getFilePath().includes('node_modules')
    ) {
      return [];
    }

    // Get all type aliases in the file
    const typeAliases = sourceFile.getTypeAliases();

    return typeAliases
      .map(typeAlias => this.convertTypeAliasToFoundContainer(typeAlias))
      .filter(m => m !== null)
      .map(processedContainer => ({
        ...processedContainer,
        filePath: sourceFile.getFilePath(),
      }));
  }

  private convertTypeAliasToFoundContainer(
    typeAlias: TypeAliasDeclaration
  ): Omit<FoundContainer, 'filePath'> | null {
    const typeNode = typeAlias.getTypeNode();

    // Skip non-exported type aliases
    if (!typeAlias.isExported()) {
      this.logSkipped(typeAlias, 'Not exported');
      return null;
    }

    if (!typeNode) {
      this.logSkipped(typeAlias, 'No TypeNode exists');
      return null;
    }

    // Check if this is a type reference (e.g., Container<...>)
    if (!Node.isTypeReference(typeNode)) {
      this.logSkipped(typeNode, 'TypeNode is not a TypeReference');
      return null;
    }

    const typeName = typeNode.getTypeName().getText();
    if (typeName !== 'Container') {
      this.logSkipped(typeNode, 'Expected Container, found ${typeName}');
      return null;
    }

    const structure = typeNode.getTypeArguments()?.[0].getType();
    if (!structure) {
      this.logSkipped(typeNode, 'TypeNode has no type arguments');
      return null;
    }

    const dependencies = structure
      .getProperty('dependencies')
      ?.getValueDeclarationOrThrow()
      .asKindOrThrow(SyntaxKind.PropertySignature)
      .getTypeNodeOrThrow()
      .asKindOrThrow(SyntaxKind.TupleType);

    const bindingsValueDecl = structure
      .getPropertyOrThrow('bindings')
      .getValueDeclarationOrThrow()
      .asKindOrThrow(SyntaxKind.PropertySignature)
      .getTypeNodeOrThrow()
      .asKindOrThrow(SyntaxKind.TypeLiteral);

    return {
      name: typeAlias.getName(),
      dependencies,
      bindings: bindingsValueDecl,
    };
  }
}
