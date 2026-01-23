import { normalizeTypeName } from '../../../normalizeTypeName';
import { TypeResolver, TypeResolutionContext } from './types';

/**
 * Fallback resolver for simple types.
 * Uses the resolved type text directly.
 */
export class SimpleTypeResolver implements TypeResolver {
  readonly name = 'SimpleTypeResolver';

  canHandle(_ctx: TypeResolutionContext): boolean {
    // This is the fallback - always returns true
    return true;
  }

  resolve(ctx: TypeResolutionContext): string {
    const typeText = ctx.param.getType().getText();
    return normalizeTypeName(typeText, ctx.param.getSourceFile());
  }
}
