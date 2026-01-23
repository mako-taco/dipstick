import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import path from 'path';
import {
  BuiltInTypeResolver,
  isBuiltInTypePath,
} from './built-in-type-resolver';
import { TypeResolutionContext } from './types';
import { getFqnForAlias } from '../../../getFqnForAlias';

describe('BuiltInTypeResolver', () => {
  let resolver: BuiltInTypeResolver;
  let project: Project;
  let userDefinedTypesFile: SourceFile;

  beforeEach(() => {
    resolver = new BuiltInTypeResolver();
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

  describe('isBuiltInTypePath', () => {
    it('should return true for typescript lib paths', () => {
      expect(
        isBuiltInTypePath('/node_modules/typescript/lib/lib.es2015.d.ts')
      ).toBe(true);
    });

    it('should return true for paths containing /lib.', () => {
      expect(isBuiltInTypePath('/some/path/lib.dom.d.ts')).toBe(true);
    });

    it('should return true for .d.ts files', () => {
      expect(isBuiltInTypePath('/some/path/types.d.ts')).toBe(true);
    });

    it('should return false for regular source files', () => {
      expect(isBuiltInTypePath('/some/path/types.ts')).toBe(false);
    });
  });

  describe('canHandle', () => {
    it('should return false when aliasSymbol is undefined', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[0];

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(false);
    });

    it('should return false for user-defined type aliases', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createConnection');
      const param = func.getParameters()[0]; // connectionUrl: DatabaseUrl

      const typeNode = param.getTypeNode();
      const aliasSymbol = typeNode?.isKind(SyntaxKind.TypeReference)
        ? (typeNode.getTypeName().getSymbol()?.getAliasedSymbol() ??
          typeNode.getTypeName().getSymbol())
        : undefined;

      const ctx: TypeResolutionContext = {
        param,
        typeNode,
        aliasSymbol,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should normalize type text for built-in types', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('simpleFunction');
      const param = func.getParameters()[0]; // name: string

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined, // Not used but required
        getFqnForAlias,
      };

      const result = resolver.resolve(ctx);
      // normalizeTypeName preserves the source file path for types
      expect(result).toMatch(/string/);
    });
  });
});
