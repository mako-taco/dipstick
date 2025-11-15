import { Symbol, SourceFile, SyntaxKind } from 'ts-morph';
import { getFqnForImportDeclaration } from './declarations/imports/getFqnForImportDeclaration';
import { CodegenError } from '../error';
import { getFqn } from './getFqn';
import { getDeclarationForName } from './getDeclarationForName';

export const getFqnForAlias = (
  aliasSymbol: Symbol,
  sourceFile: SourceFile
): string => {
  const name = aliasSymbol.getName();
  const declaration = getDeclarationForName(name, sourceFile);

  if (!declaration) {
    throw new CodegenError(
      sourceFile,
      `Symbol \`${name}\` not found in ${sourceFile.getFilePath()}!`
    );
  }

  if (declaration.isKind(SyntaxKind.ImportDeclaration)) {
    return getFqnForImportDeclaration(name, declaration);
  }

  if (!declaration.isExported()) {
    throw new CodegenError(
      declaration,
      `Symbol \`${name}\` in file ${sourceFile.getFilePath()} needs to be exported to be used in a binding`
    );
  }
  return getFqn({ name, path: declaration.getSourceFile().getFilePath() });
};
