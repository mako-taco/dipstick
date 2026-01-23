import { Project, SourceFile } from 'ts-morph';
import path from 'path';
import { SimpleTypeResolver } from './simple-type-resolver';
import { TypeResolutionContext } from './types';
import { getFqnForAlias } from '../../../getFqnForAlias';

describe('SimpleTypeResolver', () => {
  let resolver: SimpleTypeResolver;
  let project: Project;
  let userDefinedTypesFile: SourceFile;

  beforeEach(() => {
    resolver = new SimpleTypeResolver();
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    userDefinedTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/user-defined-types.ts')
    );
  });

  describe('canHandle', () => {
    it('should always return true (fallback resolver)', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[0];

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(true);
    });

    it('should return true even with aliasSymbol defined', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createConnection');
      const param = func.getParameters()[0];

      // Even with an alias symbol, canHandle should return true
      // (though in practice, other resolvers would handle this first)
      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: {} as any, // Mock alias symbol
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should return normalized type text for string', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[0]; // name: string

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      const result = resolver.resolve(ctx);
      // normalizeTypeName preserves the source file path for types
      expect(result).toMatch(/string/);
    });

    it('should return normalized type text for number', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[1]; // count: number

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      const result = resolver.resolve(ctx);
      // normalizeTypeName preserves the source file path for types
      expect(result).toMatch(/number/);
    });
  });
});
