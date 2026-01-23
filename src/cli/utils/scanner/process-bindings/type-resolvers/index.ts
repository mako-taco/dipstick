export {
  TypeResolver,
  TypeResolutionContext,
  TypeResolutionResult,
} from './types';
export {
  BuiltInTypeResolver,
  isBuiltInTypePath,
} from './built-in-type-resolver';
export { UserDefinedAliasResolver } from './user-defined-alias-resolver';
export { GenericTypeReferenceResolver } from './generic-type-reference-resolver';
export { SimpleTypeResolver } from './simple-type-resolver';

import {
  TypeResolver,
  TypeResolutionContext,
  TypeResolutionResult,
} from './types';
import { BuiltInTypeResolver } from './built-in-type-resolver';
import { UserDefinedAliasResolver } from './user-defined-alias-resolver';
import { GenericTypeReferenceResolver } from './generic-type-reference-resolver';
import { SimpleTypeResolver } from './simple-type-resolver';

/**
 * Chain of type resolvers in priority order.
 * The first resolver that can handle the context will be used.
 */
const typeResolvers: TypeResolver[] = [
  new BuiltInTypeResolver(),
  new UserDefinedAliasResolver(),
  new GenericTypeReferenceResolver(),
  new SimpleTypeResolver(), // fallback - must be last
];

/**
 * Resolve the FQN or literal type text for a parameter using the
 * appropriate resolver strategy.
 */
export const resolveParameterTypeFqn = (
  ctx: TypeResolutionContext
): TypeResolutionResult => {
  for (const resolver of typeResolvers) {
    if (resolver.canHandle(ctx)) {
      return {
        resolverName: resolver.name,
        fqnOrLiteralTypeText: resolver.resolve(ctx),
      };
    }
  }

  // Should never happen since SimpleTypeResolver always matches
  throw new Error('No type resolver matched - this should not happen');
};
