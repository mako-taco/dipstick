import { SyntaxKind, TypeNode, Symbol } from 'ts-morph';
import { NonStaticBinding, StaticBinding } from '../../../types';
import { CodegenError } from '../../../error';
import { getFqnForImportDeclaration as _getFqnForImportDeclaration } from '../../declarations/imports/getFqnForImportDeclaration';
import { getFqn } from '../../getFqn';
import { getFqnForAlias as _getFqnForAlias } from '../../getFqnForAlias';
import { getDeclarationForName as _getDeclarationForName } from '../../getDeclarationForName';
import { getParametersForName as _getParametersForName } from '../../getParametersForName';
import { normalizeTypeName } from '../../normalizeTypeName';
import { ILogger } from '../../../logger';
import { resolveParameterTypeFqn } from './type-resolvers/index';

/**
 * Given a symbol, check if it represents a type alias.
 * This follows import specifiers to find the actual declaration.
 */
const isSymbolTypeAlias = (symbol: Symbol | undefined): boolean => {
  if (!symbol) return false;

  const declarations = symbol.getDeclarations();
  for (const decl of declarations) {
    // Direct type alias declaration
    if (decl.isKind(SyntaxKind.TypeAliasDeclaration)) {
      return true;
    }
    // Import specifier - follow to the aliased symbol
    if (decl.isKind(SyntaxKind.ImportSpecifier)) {
      const aliasedSymbol = symbol.getAliasedSymbol();
      if (aliasedSymbol) {
        return isSymbolTypeAlias(aliasedSymbol);
      }
    }
  }
  return false;
};

/**
 * Given a symbol, get the actual type alias symbol by following imports.
 */
const getActualTypeAliasSymbol = (
  symbol: Symbol | undefined
): Symbol | undefined => {
  if (!symbol) return undefined;

  const declarations = symbol.getDeclarations();
  for (const decl of declarations) {
    // Direct type alias declaration - return this symbol
    if (decl.isKind(SyntaxKind.TypeAliasDeclaration)) {
      return symbol;
    }
    // Import specifier - follow to the aliased symbol
    if (decl.isKind(SyntaxKind.ImportSpecifier)) {
      const aliasedSymbol = symbol.getAliasedSymbol();
      if (aliasedSymbol) {
        return getActualTypeAliasSymbol(aliasedSymbol);
      }
    }
  }
  return undefined;
};

/**
 * Resolve the alias symbol for a type node.
 * Handles both direct alias types and type references to aliases.
 * Skips generic types like ReturnType<typeof X> since those are handled differently.
 */
const resolveAliasSymbol = (
  typeNode: TypeNode | undefined
): Symbol | undefined => {
  if (!typeNode) return undefined;

  // First try to get alias from the Type object
  let aliasSymbol = typeNode.getType().getAliasSymbol();

  // If that fails and the type node is a TypeReference, try to get
  // the symbol from the type reference directly (works for simple
  // type aliases like `type DatabaseUrl = string`)
  // But skip this for generic types like ReturnType<typeof X> since we handle those differently
  if (!aliasSymbol && typeNode.isKind(SyntaxKind.TypeReference)) {
    const hasTypeArgs = typeNode.getTypeArguments().length > 0;
    if (!hasTypeArgs) {
      const typeRefSymbol = typeNode.getTypeName().getSymbol();
      // Check if this symbol points to a type alias declaration
      // (following imports if necessary)
      if (isSymbolTypeAlias(typeRefSymbol)) {
        aliasSymbol = getActualTypeAliasSymbol(typeRefSymbol);
      }
    }
  }

  return aliasSymbol;
};

export type GetBindingArgs = {
  name: string;
  typeArgs: [TypeNode, TypeNode] | [TypeNode];
};

export const getStaticBinding =
  (logger: ILogger, getFqnForAlias = _getFqnForAlias) =>
  ({ name, typeArgs }: GetBindingArgs): StaticBinding => {
    logger.debug(`[DEBUG] getStaticBinding: name=${name}`);
    const usesTypeofKeyword = typeArgs[0].isKind(SyntaxKind.TypeQuery);
    if (usesTypeofKeyword) {
      throw new CodegenError(
        typeArgs[0],
        '`typeof` keyword is not allowed in static bindings'
      );
    }

    const aliasSymbol = resolveAliasSymbol(typeArgs[0]);

    const typeText = aliasSymbol
      ? // Binding<SomeAlias>
        aliasSymbol.getName()
      : // Binding<{hi: 5}> - use original source text, not expanded type
        typeArgs[0].getText();

    let fqnOrLiteralTypeText: string;
    if (aliasSymbol) {
      // Use the alias symbol's declaration source file for accurate FQN resolution
      const aliasDeclarations = aliasSymbol.getDeclarations();
      const aliasSourceFile =
        aliasDeclarations[0]?.getSourceFile() ?? typeArgs[0].getSourceFile();
      fqnOrLiteralTypeText = getFqnForAlias(aliasSymbol, aliasSourceFile);
    } else {
      fqnOrLiteralTypeText = typeText;
    }

    logger.debug(`[DEBUG] ↳ getStaticBinding done for ${name}`);
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
    logger: ILogger,
    getDeclarationForName = _getDeclarationForName,
    getParametersForName = _getParametersForName(_getDeclarationForName),
    getFqnForImportDeclaration = _getFqnForImportDeclaration,
    getFqnForAlias = _getFqnForAlias
  ) =>
  ({
    name,
    typeArgs,
    bindType,
  }: GetBindingArgs & {
    bindType: 'transient' | 'reusable';
  }): NonStaticBinding => {
    logger.debug(`[DEBUG] getNonStaticBinding: name=${name}`);
    const implTypeArg = typeArgs[0];
    const boundTypeArg = typeArgs[1] ?? typeArgs[0];

    const implName = implTypeArg.isKind(SyntaxKind.TypeQuery)
      ? implTypeArg.asKindOrThrow(SyntaxKind.TypeQuery).getExprName().getText()
      : implTypeArg.getText();
    logger.debug(`[DEBUG] ↳ implName=${implName}`);
    const sourceFile = implTypeArg.getSourceFile();
    logger.debug(`[DEBUG] ↳ Getting declaration for name...`);
    const implDeclaration = getDeclarationForName(implName, sourceFile);
    logger.debug(
      `[DEBUG] ↳ Declaration found: ${implDeclaration?.getKindName?.() ?? 'mock'}`
    );

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
        const importedSourceFile =
          implDeclaration.getModuleSpecifierSourceFileOrThrow();
        const actualDeclaration =
          importedSourceFile.getClass(implName) ??
          importedSourceFile.getFunction(implName) ??
          importedSourceFile.getVariableDeclaration(implName);
        if (actualDeclaration) {
          actualImplementation = actualDeclaration;
        }
      } catch {
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
      // For single typeof argument, use ReturnType<typeof functionName> syntax
      // This preserves the relationship between the bound type and the implementation
      boundTypeText = `ReturnType<typeof ${implName}>`;
      // Normalize the implFqn to use relative paths
      const normalizedImplFqn = normalizeTypeName(
        `typeof ${implFqn}`,
        sourceFile
      );
      boundFqnOrLiteralTypeText = `ReturnType<${normalizedImplFqn}>`;
    } else {
      boundTypeText = boundTypeArg.getType().getText();
      boundFqnOrLiteralTypeText = normalizeTypeName(
        boundTypeText,
        boundTypeArg.getSourceFile()
      );
    }

    logger.debug(`[DEBUG] ↳ Getting parameters for ${implName}...`);
    const parameters = getParametersForName(implName, sourceFile);
    logger.debug(
      `[DEBUG] ↳ Found ${parameters.length} parameters, processing each...`
    );

    const processedParameters = parameters.map((param, idx) => {
      logger.debug(
        `[DEBUG]   ↳ Processing parameter ${idx + 1}/${parameters.length}: ${param.getName()}`
      );

      const typeNode = param.getTypeNode();
      const aliasSymbol = resolveAliasSymbol(typeNode);

      const { resolverName, fqnOrLiteralTypeText } = resolveParameterTypeFqn({
        param,
        typeNode,
        aliasSymbol,
        getFqnForAlias,
      });

      logger.debug(`[DEBUG]     ↳ Resolved by: ${resolverName}`);
      logger.debug(
        `[DEBUG]     ↳ fqnOrLiteralTypeText: ${fqnOrLiteralTypeText.substring(0, 100)}`
      );

      return {
        name: param.getName(),
        node: param,
        usesTypeofKeyword: param.isKind(SyntaxKind.TypeQuery),
        fqnOrLiteralTypeText,
      };
    });

    logger.debug(`[DEBUG] ↳ getNonStaticBinding done for ${name}`);
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
        parameters: processedParameters,
        fqn: implFqn,
      },
    };
  };
