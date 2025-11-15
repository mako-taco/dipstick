import { SyntaxKind, TypeNode } from 'ts-morph';
import { NonStaticBinding, StaticBinding } from '../../../types';
import { CodegenError } from '../../../error';
import { getFqnForImportDeclaration as _getFqnForImportDeclaration } from '../../declarations/imports/getFqnForImportDeclaration';
import { getFqn } from '../../getFqn';
import { getFqnForAlias as _getFqnForAlias } from '../../getFqnForAlias';
import { getDeclarationForName as _getDeclarationForName } from '../../getDeclarationForName';
import { getParametersForName as _getParametersForName } from '../../getParametersForName';
import { normalizeTypeName } from '../../normalizeTypeName';

export type GetBindingArgs = {
  name: string;
  typeArgs: [TypeNode, TypeNode] | [TypeNode];
};

export const getStaticBinding =
  (getFqnForAlias = _getFqnForAlias) =>
  ({ name, typeArgs }: GetBindingArgs): StaticBinding => {
    const usesTypeofKeyword = typeArgs[0].isKind(SyntaxKind.TypeQuery);
    if (usesTypeofKeyword) {
      throw new CodegenError(
        typeArgs[0],
        '`typeof` keyword is not allowed in static bindings'
      );
    }

    const aliasSymbol = typeArgs[0].getType().getAliasSymbol();

    const typeText = aliasSymbol
      ? // Binding<SomeAlias>
        aliasSymbol.getName()
      : // Binding<{hi: 5}>
        typeArgs[0].getType().getText();

    const fqnOrLiteralTypeText = aliasSymbol
      ? getFqnForAlias(aliasSymbol, typeArgs[0].getSourceFile())
      : typeText;

    return {
      name,
      bindType: 'static',
      boundTo: {
        node: typeArgs[0],
        typeText,
        usesTypeofKeyword: false,
        fqnOrLiteralTypeText: normalizeTypeName(
          fqnOrLiteralTypeText,
          typeArgs[0].getSourceFile()
        ),
      },
    };
  };

export const getNonStaticBinding =
  (
    getDeclarationForName = _getDeclarationForName,
    getParametersForName = _getParametersForName(_getDeclarationForName),
    getFqnForImportDeclaration = _getFqnForImportDeclaration
  ) =>
  ({
    name,
    typeArgs,
    bindType,
  }: GetBindingArgs & {
    bindType: 'transient' | 'reusable';
  }): NonStaticBinding => {
    const implTypeArg = typeArgs[0];
    const boundTypeArg = typeArgs[1] ?? typeArgs[0];

    const implName = implTypeArg.isKind(SyntaxKind.TypeQuery)
      ? implTypeArg.asKindOrThrow(SyntaxKind.TypeQuery).getExprName().getText()
      : implTypeArg.getText();
    const sourceFile = implTypeArg.getSourceFile();
    const implDeclaration = getDeclarationForName(implName, sourceFile);

    if (!implDeclaration) {
      throw new CodegenError(
        implTypeArg,
        `Unable to resolve symbol \`${implName}\` in ${sourceFile.getFilePath()}`
      );
    }

    let implFqn: string;
    let actualImplementation = implDeclaration;

    if (implDeclaration.isKind(SyntaxKind.ImportDeclaration)) {
      implFqn = getFqnForImportDeclaration(implName, implDeclaration);
      // Follow the import to get the actual implementation
      try {
        const importedSourceFile = implDeclaration.getModuleSpecifierSourceFileOrThrow();
        const actualDeclaration = importedSourceFile.getClass(implName) ??
                                 importedSourceFile.getFunction(implName) ??
                                 importedSourceFile.getVariableDeclaration(implName);
        if (actualDeclaration) {
          actualImplementation = actualDeclaration;
        }
      } catch (e) {
        // If we can't follow the import, use the original declaration
      }
    } else if (implDeclaration.isExported()) {
      implFqn = getFqn({
        name: implName,
        path: sourceFile.getFilePath(),
      });
    } else {
      throw new CodegenError(
        implDeclaration,
        `The implementation for \`${name}\` must either be an export or import of ${sourceFile.getFilePath()}`
      );
    }

    // For single typeof argument, the bound type should be the return type of the function
    const shouldUseReturnType =
      typeArgs.length === 1 && implTypeArg.isKind(SyntaxKind.TypeQuery);

    let boundTypeText: string;
    let boundFqnOrLiteralTypeText: string;

    if (shouldUseReturnType) {
      // Get the return type of the function for typeof bindings
      const functionType = implTypeArg.getType();
      const callSignatures = functionType.getCallSignatures();
      if (callSignatures.length > 0) {
        const returnType = callSignatures[0].getReturnType();
        boundTypeText = returnType.getText();
        boundFqnOrLiteralTypeText = normalizeTypeName(
          boundTypeText,
          boundTypeArg.getSourceFile()
        );
      } else {
        throw new CodegenError(
          implTypeArg,
          `Cannot determine return type for function ${implName}`
        );
      }
    } else {
      boundTypeText = boundTypeArg.getType().getText();
      boundFqnOrLiteralTypeText = normalizeTypeName(
        boundTypeText,
        boundTypeArg.getSourceFile()
      );
    }

    return {
      name,
      bindType,
      boundTo: {
        node: boundTypeArg,
        usesTypeofKeyword: shouldUseReturnType
          ? false
          : boundTypeArg.isKind(SyntaxKind.TypeQuery),
        typeText: boundTypeText,
        fqnOrLiteralTypeText: boundFqnOrLiteralTypeText,
      },
      implementedBy: {
        usesTypeofKeyword: implTypeArg.isKind(SyntaxKind.TypeQuery),
        node: implTypeArg,
        typeText: implTypeArg.getType().getText(),
        isClass: actualImplementation.isKind(SyntaxKind.ClassDeclaration),
        parameters: getParametersForName(implName, sourceFile).map(param => {
          return {
            name: param.getName(),
            node: param,
            usesTypeofKeyword: param.isKind(SyntaxKind.TypeQuery),
            fqnOrLiteralTypeText: normalizeTypeName(
              param.getType().getText(),
              param.getSourceFile()
            ),
          };
        }),
        fqn: implFqn,
      },
    };
  };
