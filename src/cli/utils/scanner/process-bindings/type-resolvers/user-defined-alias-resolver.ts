import { normalizeTypeName } from '../../../normalizeTypeName';
import { TypeResolver, TypeResolutionContext } from './types';
import { isBuiltInTypePath } from './built-in-type-resolver';

/**
 * Handles user-defined type aliases (e.g., `type DatabaseUrl = string`).
 * Preserves the alias identity by using getFqnForAlias.
 */
export class UserDefinedAliasResolver implements TypeResolver {
  readonly name = 'UserDefinedAliasResolver';

  canHandle(ctx: TypeResolutionContext): boolean {
    if (!ctx.aliasSymbol) return false;

    // If BuiltInTypeResolver would handle this, we shouldn't
    const aliasDeclarations = ctx.aliasSymbol.getDeclarations();
    const firstDeclSourceFile = aliasDeclarations[0]?.getSourceFile();

    if (!firstDeclSourceFile) return false;
    if (firstDeclSourceFile.isInNodeModules()) return false;

    const declPath = firstDeclSourceFile.getFilePath();
    return !isBuiltInTypePath(declPath);
  }

  resolve(ctx: TypeResolutionContext): string {
    const aliasDeclarations = ctx.aliasSymbol!.getDeclarations();
    const aliasSourceFile =
      aliasDeclarations[0]?.getSourceFile() ?? ctx.param.getSourceFile();

    return normalizeTypeName(
      ctx.getFqnForAlias(ctx.aliasSymbol!, aliasSourceFile),
      ctx.param.getSourceFile()
    );
  }
}
