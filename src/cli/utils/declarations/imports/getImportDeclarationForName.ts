import { ImportDeclaration, SourceFile } from 'ts-morph';

export const getImportDeclarationForName = (
  name: string,
  sourceFile: SourceFile
): ImportDeclaration | undefined => {
  return sourceFile.getImportDeclarations().find(
    // imported type can be either a default import, named import, or named
    // import with an alias
    decl =>
      decl
        .getNamedImports()
        .find(
          namedImport =>
            (namedImport.getAliasNode() ?? namedImport)
              .getSymbol()
              ?.getName() === name
        ) ?? decl.getDefaultImport()?.getSymbol()?.getName() === name
  );
};
