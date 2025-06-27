import {
  Project,
  Node,
  SyntaxKind,
  SourceFile,
  TypeAliasDeclaration,
} from 'ts-morph';
import { ILogger } from './logger';
import {
  FoundModule,
  ProcessedBinding,
  ProcessedDependency,
  ProcessedModule,
  ProcessedModuleGroup,
  ProcessedModuleGroupImport,
} from './types';
import { foundModuleToProcessedDependencies } from './utils/scanner/process-deps';
import { foundModuleToProcessedBindings } from './utils/scanner/process-bindings';

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

  public findModules(): ProcessedModuleGroup[] {
    const sourceFiles = this.project.getSourceFiles();
    const foundModules: FoundModule[] = sourceFiles
      .flatMap(sourceFile => this.findModulesInSourceFile(sourceFile))
      .filter(m => m !== null);

    const byFilePath = this.groupModulesByFilePath(foundModules);

    return Array.from(byFilePath.entries()).map(
      ([filePath, modules]: [string, FoundModule[]]) => {
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
        const imports: ProcessedModuleGroupImport[] = sourceFile
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
          modules: modules.map(module => this.processModule(module)),
          imports,
        };
      }
    );
  }
  private processModule(module: FoundModule): ProcessedModule {
    const dependencies: ProcessedDependency[] =
      foundModuleToProcessedDependencies(module, this.project);
    const bindings: ProcessedBinding[] = foundModuleToProcessedBindings(
      module,
      this.project
    );

    return {
      name: module.name,
      dependencies,
      bindings,
    };
  }

  private groupModulesByFilePath(
    modules: FoundModule[]
  ): Map<string, FoundModule[]> {
    return modules.reduce((acc, module) => {
      const filePath = module.filePath;
      if (!acc.get(filePath)) {
        acc.set(filePath, []);
      }
      acc.get(filePath)!.push(module);
      return acc;
    }, new Map<string, FoundModule[]>());
  }

  private findModulesInSourceFile(sourceFile: SourceFile): FoundModule[] {
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
      .map(typeAlias => this.convertTypeAliasToFoundModule(typeAlias))
      .filter(m => m !== null)
      .map(processedModule => ({
        ...processedModule,
        filePath: sourceFile.getFilePath(),
      }));
  }

  private convertTypeAliasToFoundModule(
    typeAlias: TypeAliasDeclaration
  ): Omit<FoundModule, 'filePath'> | null {
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

    // Check if this is a type reference (e.g., dip.Module<...>)
    if (!Node.isTypeReference(typeNode)) {
      this.logSkipped(typeNode, 'TypeNode is not a TypeReference');
      return null;
    }

    const typeName = typeNode.getTypeName().getText();
    if (typeName !== 'dip.Module') {
      this.logSkipped(typeNode, 'Expected dip.Module, found ${typeName}');
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
