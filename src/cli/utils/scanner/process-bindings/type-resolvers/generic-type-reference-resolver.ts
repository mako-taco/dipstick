import { SyntaxKind } from 'ts-morph';
import { normalizeTypeName } from '../../../normalizeTypeName';
import { TypeResolver, TypeResolutionContext } from './types';

/**
 * Handles generic type references like `ReturnType<typeof X>`.
 * Reconstructs the type with normalized inner type arguments.
 */
export class GenericTypeReferenceResolver implements TypeResolver {
  readonly name = 'GenericTypeReferenceResolver';

  canHandle(ctx: TypeResolutionContext): boolean {
    // Only handle when there's no alias symbol (aliases are handled above)
    if (ctx.aliasSymbol) return false;

    return (
      ctx.typeNode?.isKind(SyntaxKind.TypeReference) === true &&
      ctx.typeNode.getTypeArguments().length > 0
    );
  }

  resolve(ctx: TypeResolutionContext): string {
    const typeNode = ctx.typeNode!;
    // TypeScript narrowing doesn't work here since we checked in canHandle
    if (!typeNode.isKind(SyntaxKind.TypeReference)) {
      throw new Error('Expected TypeReference node');
    }

    const innerTypeArg = typeNode.getTypeArguments()[0];
    const innerText = innerTypeArg?.getType().getText() ?? '';
    const outerTypeName = typeNode.getTypeName().getText();
    const innerTypeText = normalizeTypeName(
      innerText,
      ctx.param.getSourceFile()
    );

    return `${outerTypeName}<${innerTypeText}>`;
  }
}
