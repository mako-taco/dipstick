import { normalizeTypeName } from '../../../normalizeTypeName';
import { TypeResolver, TypeResolutionContext } from './types';

/**
 * Check if a source file path indicates a built-in TypeScript type.
 */
export const isBuiltInTypePath = (declPath: string): boolean => {
  return (
    declPath.includes('/node_modules/typescript/') ||
    declPath.includes('/lib.') ||
    declPath.endsWith('.d.ts')
  );
};

/**
 * Handles built-in TypeScript types like ReturnType, Partial, Record, etc.
 * These live in lib.*.d.ts files and should not have FQN resolution applied.
 */
export class BuiltInTypeResolver implements TypeResolver {
  readonly name = 'BuiltInTypeResolver';

  canHandle(ctx: TypeResolutionContext): boolean {
    if (!ctx.aliasSymbol) return false;

    const aliasDeclarations = ctx.aliasSymbol.getDeclarations();
    const firstDeclSourceFile = aliasDeclarations[0]?.getSourceFile();

    if (!firstDeclSourceFile) return true;
    if (firstDeclSourceFile.isInNodeModules()) return true;

    const declPath = firstDeclSourceFile.getFilePath();
    return isBuiltInTypePath(declPath);
  }

  resolve(ctx: TypeResolutionContext): string {
    const typeText = ctx.param.getType().getText();
    return normalizeTypeName(typeText, ctx.param.getSourceFile());
  }
}
