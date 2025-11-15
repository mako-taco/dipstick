import { SourceFile } from 'ts-morph';
import { getImportDeclarationForName } from './declarations/imports/getImportDeclarationForName';

export const getDeclarationForName = (name: string, sourceFile: SourceFile) => {
  return (
    getImportDeclarationForName(name, sourceFile) ??
    sourceFile.getVariableDeclaration(name) ??
    sourceFile.getFunction(name) ??
    sourceFile.getTypeAlias(name) ??
    sourceFile.getInterface(name) ??
    sourceFile.getClass(name)
  );
};
