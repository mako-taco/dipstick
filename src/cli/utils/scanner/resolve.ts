import {
  ClassDeclaration,
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
      resolvedType:
        | ClassDeclaration
        | InterfaceDeclaration
        | TypeAliasDeclaration;
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

  const sourceOfType = ['ts', 'tsx']
    .map(ext => project.getSourceFile(`${resolution.importPath}.${ext}`))
    .find(Boolean);

  if (!sourceOfType) {
    return {
      error: `Could not find source file for ${resolution.name} implementation type in ${resolution.importPath}`,
    };
  }

  const resolvedType =
    sourceOfType.getClass(resolution.name) ??
    sourceOfType.getInterface(resolution.name) ??
    sourceOfType.getTypeAlias(resolution.name);

  if (!resolvedType) {
    return {
      error: `Could not find class or interface ${resolution.name} in ${resolution.importPath}`,
    };
  }

  return {
    error: null,
    resolvedType,
  };
};

export const resolveTypeToClass = (
  type: Type,
  sourceFilePath: string,
  project: Project
): { error: null; resolvedType: ClassDeclaration } | { error: string } => {
  const result = resolveType(type, sourceFilePath, project);
  if (result.error !== null) {
    return result;
  }

  if (!result.resolvedType.isKind(SyntaxKind.ClassDeclaration)) {
    return {
      error: `Resolved type ${result.resolvedType.getName()} is not a class`,
    };
  }

  return {
    error: null,
    resolvedType: result.resolvedType,
  };
};
