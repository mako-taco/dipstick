import {
  Project,
  SourceFile,
  SyntaxKind,
  OptionalKind,
  Scope,
  ParameterDeclarationStructure,
  Type,
} from "ts-morph";
import { FoundModule } from "../scanner";
import { ILogger } from "../logger";
import { encodeJsIdentifier } from "./encodeJsIdentifier";
import { generateMethods } from "./generateMethods";

export function generateFile({
  project,
  modules,
  logger,
  path,
  sourceFile,
}: {
  project: Project;
  modules: Omit<FoundModule, "filePath">[];
  logger: ILogger;
  path: string;
  sourceFile: SourceFile;
}): SourceFile {
  const generatedSourceFile = project.createSourceFile(path, "", {
    overwrite: true,
  });

  // Generate implementation for each module
  for (const module of modules) {
    const moduleName = module.typeAlias.getName();
    const typeNode = module.typeAlias.getTypeNode();
    if (!typeNode || !typeNode.isKind(SyntaxKind.TypeReference)) {
      logger.errorWithContext(
        generatedSourceFile,
        module.typeAlias.getStartLineNumber(),
        "Expected exported module to be a type alias"
      );
      throw new Error("Malformed module declaration");
    }

    const typeArgs = typeNode.getTypeArguments();
    if (typeArgs.length === 0) {
      logger.errorWithContext(
        generatedSourceFile,
        typeNode.getStartLineNumber(),
        "Missing type argument for exported module"
      );
      throw new Error("Malformed module declaration");
    }

    const structureType = typeArgs[0];
    if (!structureType.isKind(SyntaxKind.TypeLiteral)) {
      logger.errorWithContext(
        generatedSourceFile,
        structureType.getStartLineNumber(),
        "Expected exported module type argument to be a type literal"
      );
      throw new Error("Malformed module declaration");
    }

    const structure = structureType.asKindOrThrow(SyntaxKind.TypeLiteral);

    // Extract dependencies, parent, provided, and bindings
    const dependencies =
      structure
        .getProperty("dependencies")
        ?.getChildrenOfKind(SyntaxKind.TupleType)[0]
        .getElements() ?? [];
    const parent = structure.getProperty("parent")?.getTypeNode()?.getType();
    const provided =
      structure.getProperty("provided")?.getType().getProperties() || [];
    const bindings =
      structure.getProperty("bindings")?.getType().getProperties() || [];
    const { methods, properties: cacheProperties } = generateMethods({
      bindings,
      dependencies,
      parent,
      provided,
    });
    // Generate class implementation
    const addedClass = generatedSourceFile.addClass({
      name: `${moduleName}_Impl`,
      implements: [moduleName],
      isExported: true,
      properties: cacheProperties,
      ctors: [
        {
          parameters: [
            // Add parent parameter if exists
            ...(parent
              ? [
                  {
                    name: "parent",
                    type: parent.getText(),
                    isReadonly: true,
                    scope: Scope.Private,
                  } satisfies OptionalKind<ParameterDeclarationStructure>,
                ]
              : []),
            // Add dependency parameters
            ...dependencies.map(
              (dep) =>
                ({
                  name: encodeJsIdentifier(dep.getText()),
                  type: dep.getText(),
                  isReadonly: true,
                  scope: Scope.Private,
                } satisfies OptionalKind<ParameterDeclarationStructure>)
            ),
            // Add provided parameters
            ...provided.map(
              (prop) =>
                ({
                  name: `_${prop.getName()}`,
                  type: prop.getValueDeclarationOrThrow().getType().getText(),
                  isReadonly: true,
                  scope: Scope.Private,
                } satisfies OptionalKind<ParameterDeclarationStructure>)
            ),
          ],
        },
      ],
      methods,
    });

    const exportedNamesFromSource = sourceFile
      .getExportSymbols()
      .map((exportSymbol) => exportSymbol.getName());

    sourceFile.addImportDeclaration({
      namedImports: exportedNamesFromSource,
      moduleSpecifier:
        generatedSourceFile.getRelativePathAsModuleSpecifierTo(sourceFile),
    });

    // Copy all imports from the source file to the generated file. This will get some extra stuff.
    sourceFile.getImportDeclarations().forEach((importDeclaration) => {
      generatedSourceFile.addImportDeclaration({
        namedImports: importDeclaration
          .getNamedImports()
          .map((importSpecifier) => importSpecifier.getName()),
        moduleSpecifier: importDeclaration.getModuleSpecifierValue(),
      });
    });
  }

  console.log(generatedSourceFile.getFullText());
  return generatedSourceFile;
}
