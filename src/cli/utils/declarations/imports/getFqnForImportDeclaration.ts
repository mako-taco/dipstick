import { ImportDeclaration } from 'ts-morph';
import { getFqn } from '../../getFqn';
import { CodegenError } from '../../../error';

export const getFqnForImportDeclaration = (
  name: string,
  importDeclaration: ImportDeclaration
): string => {
  const importSourceFile = importDeclaration.getModuleSpecifierSourceFile();
  const path = importSourceFile?.getFilePath();
  const module = importDeclaration.getModuleSpecifierValue();

  const arg = path ? { name, path } : module ? { name, module } : null;
  if (!arg)
    throw new CodegenError(
      importDeclaration,
      'Import declaration has no path or module?'
    );

  return getFqn(arg);
};
