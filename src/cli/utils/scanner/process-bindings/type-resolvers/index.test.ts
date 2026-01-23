import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import path from 'path';
import { resolveParameterTypeFqn, TypeResolutionContext } from './index';
import { getFqnForAlias } from '../../../getFqnForAlias';

describe('resolveParameterTypeFqn', () => {
  let project: Project;
  let userDefinedTypesFile: SourceFile;
  let importsExternalTypesFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/external-types.ts')
    );
    userDefinedTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/user-defined-types.ts')
    );
    importsExternalTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/imports-external-types.ts')
    );
  });

  const getAliasSymbol = (
    func: ReturnType<SourceFile['getFunctionOrThrow']>,
    paramIndex: number
  ) => {
    const param = func.getParameters()[paramIndex];
    const typeNode = param.getTypeNode();
    if (!typeNode?.isKind(SyntaxKind.TypeReference)) return undefined;

    const symbol = typeNode.getTypeName().getSymbol();
    return symbol?.getAliasedSymbol() ?? symbol;
  };

  describe('resolver selection', () => {
    it('should use SimpleTypeResolver for primitive types', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[0]; // name: string

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      const result = resolveParameterTypeFqn(ctx);
      expect(result.resolverName).toBe('SimpleTypeResolver');
      // normalizeTypeName preserves the source file path for types
      expect(result.fqnOrLiteralTypeText).toMatch(/string/);
    });

    it('should use UserDefinedAliasResolver for type aliases', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createConnection');
      const param = func.getParameters()[0]; // connectionUrl: DatabaseUrl
      const aliasSymbol = getAliasSymbol(func, 0);

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol,
        getFqnForAlias,
      };

      const result = resolveParameterTypeFqn(ctx);
      expect(result.resolverName).toBe('UserDefinedAliasResolver');
      expect(result.fqnOrLiteralTypeText).toMatch(/DatabaseUrl/);
    });

    it('should use GenericTypeReferenceResolver for ReturnType', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createService');
      const param = func.getParameters()[0]; // config: ReturnType<typeof getConfig>

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      const result = resolveParameterTypeFqn(ctx);
      expect(result.resolverName).toBe('GenericTypeReferenceResolver');
      expect(result.fqnOrLiteralTypeText).toMatch(/^ReturnType</);
    });
  });

  describe('imported type alias resolution', () => {
    it('should resolve imported type aliases to their original file', () => {
      const func = importsExternalTypesFile.getFunctionOrThrow(
        'createExternalService'
      );
      const param = func.getParameters()[0]; // apiKey: ExternalApiKey
      const aliasSymbol = getAliasSymbol(func, 0);

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol,
        getFqnForAlias,
      };

      const result = resolveParameterTypeFqn(ctx);
      expect(result.resolverName).toBe('UserDefinedAliasResolver');
      expect(result.fqnOrLiteralTypeText).toMatch(/ExternalApiKey/);
      expect(result.fqnOrLiteralTypeText).toMatch(/external-types/);
    });
  });
});
