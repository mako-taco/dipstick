import { TypeNode, Symbol, ParameterDeclaration } from 'ts-morph';
import { getFqnForAlias as _getFqnForAlias } from '../../../getFqnForAlias';

/**
 * Context passed to type resolvers containing all the information
 * needed to resolve the FQN or literal type text for a parameter.
 */
export type TypeResolutionContext = {
  param: ParameterDeclaration;
  typeNode: TypeNode | undefined;
  aliasSymbol: Symbol | undefined;
  getFqnForAlias: typeof _getFqnForAlias;
};

/**
 * Interface for type resolution strategies.
 * Each resolver handles a specific category of types.
 */
export interface TypeResolver {
  /**
   * Unique name for this resolver (useful for debugging)
   */
  readonly name: string;

  /**
   * Check if this resolver can handle the given type context.
   */
  canHandle(ctx: TypeResolutionContext): boolean;

  /**
   * Resolve the FQN or literal type text for the parameter.
   * Only called if canHandle returns true.
   */
  resolve(ctx: TypeResolutionContext): string;
}

/**
 * Result from resolving a parameter type.
 */
export type TypeResolutionResult = {
  resolverName: string;
  fqnOrLiteralTypeText: string;
};
