import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import path from 'path';
import { GenericTypeReferenceResolver } from './generic-type-reference-resolver';
import { TypeResolutionContext } from './types';
import { getFqnForAlias } from '../../../getFqnForAlias';

describe('GenericTypeReferenceResolver', () => {
  let resolver: GenericTypeReferenceResolver;
  let project: Project;
  let userDefinedTypesFile: SourceFile;

  beforeEach(() => {
    resolver = new GenericTypeReferenceResolver();
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
    it('should return false when aliasSymbol is defined', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createConnection');
      const param = func.getParameters()[0]; // connectionUrl: DatabaseUrl
      const typeNode = param.getTypeNode();

      // Mock having an alias symbol
      const ctx: TypeResolutionContext = {
        param,
        typeNode,
        aliasSymbol: typeNode?.isKind(SyntaxKind.TypeReference)
          ? typeNode.getTypeName().getSymbol()
          : undefined,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(false);
    });

    it('should return false for simple types without type arguments', () => {
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

    it('should return true for generic type references', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createService');
      const param = func.getParameters()[0]; // config: ReturnType<typeof getConfig>
      const typeNode = param.getTypeNode();

      const ctx: TypeResolutionContext = {
        param,
        typeNode,
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      expect(resolver.canHandle(ctx)).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should reconstruct generic type with normalized inner type', () => {
      const func = userDefinedTypesFile.getFunctionOrThrow('createService');
      const param = func.getParameters()[0]; // config: ReturnType<typeof getConfig>

      const ctx: TypeResolutionContext = {
        param,
        typeNode: param.getTypeNode(),
        aliasSymbol: undefined,
        getFqnForAlias,
      };

      const result = resolver.resolve(ctx);
      expect(result).toMatch(/^ReturnType</);
      expect(result).toMatch(/getConfig/);
    });
  });
});
