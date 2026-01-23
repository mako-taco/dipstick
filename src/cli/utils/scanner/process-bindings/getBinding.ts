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

    // First try to get alias from the Type object
    let aliasSymbol = typeArgs[0].getType().getAliasSymbol();

    // If that fails and the type argument is a TypeReference, try to get
    // the symbol from the type reference directly (works for simple
    // type aliases like `type DatabaseUrl = string`)
    if (!aliasSymbol && typeArgs[0].isKind(SyntaxKind.TypeReference)) {
      const typeRefSymbol = typeArgs[0].getTypeName().getSymbol();
      // Check if this symbol points to a type alias declaration
      // (following imports if necessary)
      if (isSymbolTypeAlias(typeRefSymbol)) {
        aliasSymbol = getActualTypeAliasSymbol(typeRefSymbol);
      }
    }

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
      // Check if the parameter type is a type alias (e.g., type DatabaseUrl = string)
      // If so, preserve the alias identity instead of resolving to the underlying type
      logger.debug(`[DEBUG]     ↳ Getting type node...`);
      const typeNode = param.getTypeNode();
      logger.debug(`[DEBUG]     ↳ Type node kind: ${typeNode?.getKindName()}`);

      // First try to get alias from the Type object
      logger.debug(`[DEBUG]     ↳ Getting alias symbol from Type object...`);
      let aliasSymbol = typeNode?.getType().getAliasSymbol();
      logger.debug(
        `[DEBUG]     ↳ Alias symbol: ${aliasSymbol?.getName() ?? 'none'}`
      );

      // If that fails and the type node is a TypeReference, try to get
      // the symbol from the type reference directly (works for simple
      // type aliases like `type DatabaseUrl = string`)
      // But skip this for generic types like ReturnType<typeof X> since we handle those differently
      if (!aliasSymbol && typeNode?.isKind(SyntaxKind.TypeReference)) {
        const hasTypeArgs = typeNode.getTypeArguments().length > 0;
        if (hasTypeArgs) {
          logger.debug(
            `[DEBUG]     ↳ TypeReference with type args, skipping alias resolution`
          );
        } else {
          logger.debug(
            `[DEBUG]     ↳ TypeReference detected, getting symbol...`
          );
          const typeRefSymbol = typeNode.getTypeName().getSymbol();
          logger.debug(
            `[DEBUG]     ↳ TypeRef symbol: ${typeRefSymbol?.getName() ?? 'none'}`
          );
          // Check if this symbol points to a type alias declaration
          // (following imports if necessary)
          logger.debug(`[DEBUG]     ↳ Checking if symbol is type alias...`);
          if (isSymbolTypeAlias(typeRefSymbol)) {
            logger.debug(
              `[DEBUG]     ↳ Is type alias, getting actual symbol...`
            );
            aliasSymbol = getActualTypeAliasSymbol(typeRefSymbol);
          }
          logger.debug(`[DEBUG]     ↳ Type alias check complete`);
        }
      }

      let fqnOrLiteralTypeText: string;
      if (aliasSymbol) {
        logger.debug(
          `[DEBUG]     ↳ Using alias symbol path for: ${aliasSymbol.getName()}`
        );
        // Check if this is a built-in TypeScript type (like ReturnType, Partial, etc.)
        // These live in lib.*.d.ts files and we should not try to resolve them
        const aliasDeclarations = aliasSymbol.getDeclarations();
        const firstDeclSourceFile = aliasDeclarations[0]?.getSourceFile();
        const declPath = firstDeclSourceFile?.getFilePath() ?? '';
        logger.debug(`[DEBUG]     ↳ Alias decl path: ${declPath}`);
        const isBuiltIn =
          !firstDeclSourceFile ||
          declPath.includes('/node_modules/typescript/') ||
          declPath.includes('/lib.') ||
          declPath.endsWith('.d.ts') ||
          firstDeclSourceFile.isInNodeModules();

        if (isBuiltIn) {
          logger.debug(`[DEBUG]     ↳ Built-in type detected, using type text`);
          // For built-in types, just use the resolved type text
          const typeText = param.getType().getText();
          logger.debug(
            `[DEBUG]     ↳ Type text: ${typeText.substring(0, 100)}`
          );
          fqnOrLiteralTypeText = normalizeTypeName(
            typeText,
            param.getSourceFile()
          );
        } else {
          logger.debug(`[DEBUG]     ↳ User-defined type alias`);
          // Parameter uses a user-defined type alias - preserve the alias identity
          // Use the alias symbol's declaration source file, not the parameter's source file
          const aliasSourceFile =
            aliasDeclarations[0]?.getSourceFile() ?? param.getSourceFile();
          fqnOrLiteralTypeText = normalizeTypeName(
            getFqnForAlias(aliasSymbol, aliasSourceFile),
            param.getSourceFile()
          );
        }
      } else {
        // Fallback - check if type node has generic type args (like ReturnType<typeof X>)
        // If so, use the type node text to preserve the structure
        if (
          typeNode?.isKind(SyntaxKind.TypeReference) &&
          typeNode.getTypeArguments().length > 0
        ) {
          logger.debug(
            `[DEBUG]     ↳ Generic type detected, using type node text...`
          );
          // Use the alias type text which preserves ReturnType<typeof X> structure
          const aliasTypeText = typeNode.getType().getAliasTypeArguments();
          const innerTypeArg = typeNode.getTypeArguments()[0];
          const innerText = innerTypeArg?.getType().getText() ?? '';
          logger.debug(`[DEBUG]     ↳ Inner type text: ${innerText}`);

          // Reconstruct with FQN: ReturnType<typeof "/path".funcName>
          const outerTypeName = typeNode.getTypeName().getText();
          const innerTypeText = normalizeTypeName(
            innerText,
            param.getSourceFile()
          );
          fqnOrLiteralTypeText = `${outerTypeName}<${innerTypeText}>`;
          logger.debug(
            `[DEBUG]     ↳ Reconstructed: ${fqnOrLiteralTypeText.substring(0, 100)}`
          );
        } else {
          // Simple type - use resolved type text
          logger.debug(`[DEBUG]     ↳ Fallback: getting type text...`);
          const typeText = param.getType().getText();
          logger.debug(
            `[DEBUG]     ↳ Type text: ${typeText.substring(0, 100)}`
          );
          fqnOrLiteralTypeText = normalizeTypeName(
            typeText,
            param.getSourceFile()
          );
        }
      }
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
