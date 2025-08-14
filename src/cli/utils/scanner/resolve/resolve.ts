import {
  ClassDeclaration,
  FunctionDeclaration,
  ImportDeclaration,
  InterfaceDeclaration,
  Project,
  Symbol,
  SyntaxKind,
  Type,
  TypeAliasDeclaration,
} from 'ts-morph';

export const resolveType = (
  type: Type,
  sourceFilePath: string,
  project: Project
):
  | {
      error: null;
      name: string;
      resolvedType:
        | ClassDeclaration
        | InterfaceDeclaration
        | TypeAliasDeclaration
        | FunctionDeclaration
        | ImportDeclaration;
    }
  | { error: string } => {
  const resolution = [type.getSymbol(), type.getAliasSymbol()]
    .filter(
      (symbol): symbol is Symbol =>
        !!symbol && symbol.getFullyQualifiedName() !== '__type'
    )
    .map(symbol => {
      const fqn = symbol.getFullyQualifiedName();
      const execResult = /^"(.*?)"\./.exec(fqn);

      return {
        name: symbol.getName(),
        // Its possible that this type exists in sourceFile, meaning its FQN would contain no file path
        importPath: execResult?.[1] ?? sourceFilePath.replace(/\.tsx?$/, ''),
      };
    })
    .find(result => !!result);

  if (!resolution) {
    return { error: 'Malformed FQN' };
  }

  const sourceOfType =
    ['ts', 'tsx']
      .map(ext => project.getSourceFile(`${resolution.importPath}.${ext}`))
      .find(Boolean) ?? project.getSourceFile(sourceFilePath);

  if (!sourceOfType) {
    return {
      error: `Could not find source file for ${resolution.name} implementation type in ${resolution.importPath}`,
    };
  }

  const resolvedType =
    sourceOfType.getClass(resolution.name) ??
    sourceOfType.getInterface(resolution.name) ??
    sourceOfType.getTypeAlias(resolution.name) ??
    sourceOfType.getFunction(resolution.name) ??
    sourceOfType.getImportDeclarations().find(
      // imported type can be either a default import, named import, or named
      // import with an alias
      decl =>
        decl
          .getNamedImports()
          .find(
            namedImport =>
              (namedImport.getAliasNode() ?? namedImport)
                .getSymbol()
                ?.getName() === resolution.name
          ) ??
        decl.getDefaultImport()?.getSymbol()?.getName() === resolution.name
    );

  if (!resolvedType) {
    return {
      error: `Could not find class or interface ${resolution.name} in ${resolution.importPath}`,
    };
  }

  return {
    error: null,
    name: resolution.name,
    resolvedType,
  };
};

export const resolveTypeToDeclaration = (
  type: Type,
  sourceFilePath: string,
  project: Project
):
  | {
      error: null;
      name: string;
      resolvedType: ClassDeclaration | FunctionDeclaration;
    }
  | { error: string } => {
  const result = resolveType(type, sourceFilePath, project);
  if (result.error !== null) {
    return result;
  }

  if (
    !result.resolvedType.isKind(SyntaxKind.ClassDeclaration) &&
    !result.resolvedType.isKind(SyntaxKind.FunctionDeclaration)
  ) {
    return {
      error: `Resolved type ${result.name} is not a class or function`,
    };
  }

  return {
    error: null,
    name: result.name,
    resolvedType: result.resolvedType,
  };
};
