import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import path from 'path';
import { UserDefinedAliasResolver } from './user-defined-alias-resolver';
import { TypeResolutionContext } from './types';
import { getFqnForAlias } from '../../../getFqnForAlias';

describe('UserDefinedAliasResolver', () => {
  let resolver: UserDefinedAliasResolver;
  let project: Project;
  let userDefinedTypesFile: SourceFile;
  let importsExternalTypesFile: SourceFile;

  beforeEach(() => {
    resolver = new UserDefinedAliasResolver();
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
    // Follow import specifier to get the actual aliased symbol
    return symbol?.getAliasedSymbol() ?? symbol;
  };

  describe('canHandle', () => {
    it('should return false when aliasSymbol is undefined', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[0]; // name: string

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(false);
    });

    it('should return true for user-defined type aliases in same file', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createConnection');
      const param = func.getParameters()[0]; // connectionUrl: DatabaseUrl
      const aliasSymbol = getAliasSymbol(func, 0);

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(true);
    });

    it('should return true for imported user-defined type aliases', () => {
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

      expect(resolver.canHandle(ctx)).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should return FQN for user-defined type alias', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createConnection');
      const param = func.getParameters()[0]; // connectionUrl: DatabaseUrl
      const aliasSymbol = getAliasSymbol(func, 0);

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol,
        getFqnForAlias,
      };

      const result = resolver.resolve(ctx);
      expect(result).toMatch(/DatabaseUrl/);
      expect(result).toMatch(/user-defined-types/);
    });

    it('should return FQN referencing original file for imported type alias', () => {
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

      const result = resolver.resolve(ctx);
      expect(result).toMatch(/ExternalApiKey/);
      // Should reference the original file, not the importing file
      expect(result).toMatch(/external-types/);
    });
  });
});
