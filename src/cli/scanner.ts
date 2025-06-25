import {
  Project,
  Node,
  SyntaxKind,
  SourceFile,
  Type,
  TypeAliasDeclaration,
  TypeLiteralNode,
  TupleTypeNode,
  PropertySignature,
  ts,
  InterfaceDeclaration,
  ClassDeclaration,
} from "ts-morph";
import { ILogger } from "./logger";
import { ErrorWithContext } from "./error";
import {
  resolveTypeToClass,
  resolveType,
  resolveTypeToInterfaceOrTypeAlias,
} from "./resolve";

interface FoundModule {
  name: string;
  filePath: string;
  dependencies?: TupleTypeNode;
  bindings?: TypeLiteralNode;
}

export type ProcessedBinding = {
  name: string;
  bindType: "reusable" | "transient" | "static";
  implType: ClassDeclaration;
  ifaceType: InterfaceDeclaration | ClassDeclaration | TypeAliasDeclaration;
  pos: [number, number];
};

export type ProcessedDependency = {
  text: string;
  type: InterfaceDeclaration | TypeAliasDeclaration;
  pos: [number, number];
};

export interface ProcessedModule {
  name: string;
  dependencies: ProcessedDependency[];
  bindings: ProcessedBinding[];
}

export type ProcessedSourceFile = {
  name: string;
  filePath: string;
  dependencies?: {
    text: string;
    type: Type;
  };
  bindings: {
    name: string;
    type: Type;
  }[];
}[];

export interface ProcessedModuleGroup {
  filePath: string;
  sourceFilePath: string;
  imports: {
    namedImports: {
      name: string;
      isTypeOnly: boolean;
    }[];
    moduleSpecifier: string;
  }[];
  modules: ProcessedModule[];
}

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
      .flatMap((sourceFile) => this.findModulesInSourceFile(sourceFile))
      .filter((m) => m !== null);

    const byFilePath = this.groupModulesByFilePath(foundModules);

    return Array.from(byFilePath.entries()).map(
      ([filePath, modules]: [string, FoundModule[]]) => {
        if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
          throw new Error(
            `Invalid file extension for module file: ${filePath}. Expected .ts or .tsx`
          );
        }

        const generatedFilePath = filePath.replace(/(\.tsx|\.ts)$/, ".gen$1");
        const generatedSourceFile =
          this.project.getSourceFile(generatedFilePath) ??
          this.project.createSourceFile(generatedFilePath);

        const sourceFile = this.project.getSourceFileOrThrow(filePath);
        const imports: ProcessedModuleGroup["imports"] = sourceFile
          .getImportDeclarations()
          .map((sourceImport) => ({
            namedImports: sourceImport.getNamedImports().map((ni) => {
              return {
                name: ni.getName(),
                isTypeOnly: ni.isTypeOnly(),
              };
            }),
            moduleSpecifier: sourceImport.getModuleSpecifier().getLiteralText(),
          }))
          .concat([
            {
              namedImports: sourceFile.getExportSymbols().map((e) => {
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
          modules: modules.map((module) =>
            this.processModule(module, sourceFile)
          ),
          imports,
        };
      }
    );
  }
  private processModule(
    module: FoundModule,
    sourceFile: SourceFile
  ): ProcessedModule {
    const dependencies: ProcessedModule["dependencies"] =
      module.dependencies?.getElements().map((element) => {
        const type = element.getType();
        const result = resolveTypeToInterfaceOrTypeAlias(
          type,
          sourceFile,
          this.project
        );
        if (result.error !== null) {
          throw new ErrorWithContext(
            sourceFile,
            [element.getStart(), element.getEnd()],
            result.error
          );
        }

        const { resolvedType } = result;

        return {
          text: element.getText(),
          type: resolvedType,
          pos: [element.getStart(), element.getEnd()],
        };
      }) ?? [];

    const bindings: ProcessedModule["bindings"] =
      module.bindings?.getProperties().map((property) => {
        const typeArgs = property
          .getTypeNode()
          ?.asKind(SyntaxKind.TypeReference)
          ?.getTypeArguments();

        if (!typeArgs) {
          throw new ErrorWithContext(
            sourceFile,
            [property.getStart(), property.getEnd()],
            `Could not find type arguments for binding ${property.getName()}. Bindings MUST be in the form of 'name: dip.Bind.(Reusable|Static|Transient)<T>`
          );
        }

        const implType = typeArgs[0].getType();
        const implTypeResult = resolveTypeToClass(
          implType,
          sourceFile,
          this.project
        );
        if (implTypeResult.error !== null) {
          throw new ErrorWithContext(
            sourceFile,
            [property.getStart(), property.getEnd()],
            implTypeResult.error
          );
        }

        const ifaceType = (typeArgs[1] ?? typeArgs[0]).getType();
        const ifaceTypeResult = resolveType(
          ifaceType,
          sourceFile,
          this.project
        );
        if (ifaceTypeResult.error !== null) {
          throw new ErrorWithContext(
            sourceFile,
            [property.getStart(), property.getEnd()],
            ifaceTypeResult.error
          );
        }

        return {
          name: property.getName(),
          bindType: this.getBindingTypeFromProperty(property),
          pos: [property.getStart(), property.getEnd()],
          implType: implTypeResult.resolvedType,
          ifaceType: ifaceTypeResult.resolvedType,
        };
      }) ?? [];

    return {
      name: module.name,
      dependencies,
      bindings,
    };
  }

  private getBindingTypeFromProperty(
    property: PropertySignature
  ): "reusable" | "transient" | "static" {
    const propertyTypeText = property.getType().getText();
    return propertyTypeText.indexOf("Reusable") !== -1
      ? "reusable"
      : propertyTypeText.indexOf("Transient") !== -1
      ? "transient"
      : propertyTypeText.indexOf("Static") !== -1
      ? "static"
      : (() => {
          throw new Error("Unknown binding type");
        })();
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
      sourceFile.getFilePath().includes("node_modules")
    ) {
      return [];
    }

    // Get all type aliases in the file
    const typeAliases = sourceFile.getTypeAliases();

    return typeAliases
      .map((typeAlias) => this.convertTypeAliasToFoundModule(typeAlias))
      .filter((m) => m !== null)
      .map((processedModule) => ({
        ...processedModule,
        filePath: sourceFile.getFilePath(),
      }));
  }

  private convertTypeAliasToFoundModule(
    typeAlias: TypeAliasDeclaration
  ): Omit<FoundModule, "filePath"> | null {
    const typeNode = typeAlias.getTypeNode();

    // Skip non-exported type aliases
    if (!typeAlias.isExported()) {
      this.logSkipped(typeAlias, "Not exported");
      return null;
    }

    if (!typeNode) {
      this.logSkipped(typeAlias, "No TypeNode exists");
      return null;
    }

    // Check if this is a type reference (e.g., dip.Module<...>)
    if (!Node.isTypeReference(typeNode)) {
      this.logSkipped(typeNode, "TypeNode is not a TypeReference");
      return null;
    }

    const typeName = typeNode.getTypeName().getText();
    if (typeName !== "dip.Module") {
      this.logSkipped(typeNode, "Expected dip.Module, found ${typeName}");
      return null;
    }

    const structure = typeNode.getTypeArguments()?.[0].getType();
    if (!structure) {
      this.logSkipped(typeNode, "TypeNode has no type arguments");
      return null;
    }

    const dependencies = structure
      .getProperty("dependencies")
      ?.getValueDeclarationOrThrow()
      .asKindOrThrow(SyntaxKind.PropertySignature)
      .getTypeNodeOrThrow()
      .asKindOrThrow(SyntaxKind.TupleType);

    const bindingsValueDecl = structure
      .getPropertyOrThrow("bindings")
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
