import { ParameterDeclaration, SourceFile, SyntaxKind } from 'ts-morph';
import { getDeclarationForName as _getDeclarationForName } from './getDeclarationForName';
import { CodegenError } from '../error';

export const getParametersForName = (
  getDeclarationForName = _getDeclarationForName
) => {
  const boundGetParametersForName = (
    name: string,
    sourceFile: SourceFile
  ): ParameterDeclaration[] => {
    const declaration = getDeclarationForName(name, sourceFile);
    if (declaration?.isKind(SyntaxKind.ImportDeclaration)) {
      return boundGetParametersForName(
        name,
        declaration.getModuleSpecifierSourceFileOrThrow()
      );
    } else if (declaration?.isKind(SyntaxKind.FunctionDeclaration)) {
      return declaration.getParameters();
    } else if (declaration?.isKind(SyntaxKind.VariableDeclaration)) {
      // If the variable declaration is for a class or function, get the parameters
      const initializer = declaration.getInitializer();
      if (!initializer) {
        throw new CodegenError(
          declaration,
          `Variable \`${name}\` in ${sourceFile.getFilePath()} cannot be used as a binding because it lacks an initializer`
        );
      }
      if (initializer.getKind() === SyntaxKind.ClassExpression) {
        // Class expression assigned to variable
        return (
          initializer
            .asKindOrThrow(SyntaxKind.ClassExpression)
            .getConstructors()[0]
            ?.getParameters() ?? []
        );
      } else if (initializer.getKind() === SyntaxKind.FunctionExpression) {
        // Function expression or arrow function assigned to variable
        return initializer
          .asKindOrThrow(SyntaxKind.FunctionExpression)
          .getParameters();
      } else if (initializer.getKind() === SyntaxKind.ArrowFunction) {
        // Arrow function assigned to variable
        return initializer
          .asKindOrThrow(SyntaxKind.ArrowFunction)
          .getParameters();
      }
      throw new CodegenError(initializer, 'Unknown initializer type');
    } else if (declaration?.isKind(SyntaxKind.TypeAliasDeclaration)) {
      throw new CodegenError(
        declaration,
        `Type alias \`${name}\` in ${sourceFile.getFilePath()} cannot be used as a binding`
      );
    } else if (declaration?.isKind(SyntaxKind.InterfaceDeclaration)) {
      throw new CodegenError(
        declaration,
        `Interface \`${name}\` in ${sourceFile.getFilePath()} cannot be used as a binding`
      );
    } else if (declaration?.isKind(SyntaxKind.ClassDeclaration)) {
      return declaration.getConstructors()[0]?.getParameters() ?? [];
    } else {
      throw new Error(
        `Unable to resolve symbol \`${name}\` in ${sourceFile.getFilePath()}`
      );
    }
  };
  return boundGetParametersForName;
};
