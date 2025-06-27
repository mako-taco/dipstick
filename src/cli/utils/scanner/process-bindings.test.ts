import { Project, SourceFile, SyntaxKind, TypeLiteralNode } from 'ts-morph';
import { foundModuleToProcessedBindings } from './process-bindings';
import { FoundModule } from '../../types';
import path from 'path';

describe('process-bindings', () => {
  let project: Project;
  let fixturesFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    fixturesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/test-modules.ts')
    );
  });

  // Helper function to get TypeLiteralNode from type alias
  const getBindingsFromTypeAlias = (typeAliasName: string): TypeLiteralNode => {
    const typeAlias = fixturesFile.getTypeAlias(typeAliasName);
    if (!typeAlias) {
      throw new Error(`Type alias ${typeAliasName} not found in fixtures`);
    }

    const typeNode = typeAlias.getTypeNode();
    if (!typeNode) {
      throw new Error(`Type node not found for ${typeAliasName}`);
    }

    const typeLiteral = typeNode.asKind(SyntaxKind.TypeLiteral);
    if (!typeLiteral) {
      throw new Error(`Expected TypeLiteralNode for ${typeAliasName}`);
    }

    return typeLiteral;
  };

  describe('foundModuleToProcessedBindings', () => {
    it('should process reusable bindings with single type argument', () => {
      const bindings = getBindingsFromTypeAlias('ReusableBindings');

      const foundModule: FoundModule = {
        name: 'ReusableModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      // Let the real resolve functions work with the fixture types
      const result = foundModuleToProcessedBindings(foundModule, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('reusable');
      expect(result[0].impl.declaration.getName()).toBe('TestService');
      expect(result[0].iface.declaration.getName()).toBe('TestService');
    });

    it('should process transient bindings with two type arguments', () => {
      const bindings = getBindingsFromTypeAlias('TransientBindings');

      const foundModule: FoundModule = {
        name: 'TransientModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundModuleToProcessedBindings(foundModule, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('transient');
      expect(result[0].impl.declaration.getName()).toBe('TestService');
      expect(result[0].iface.declaration.getName()).toBe('ITestService');
    });

    it('should process static bindings', () => {
      const bindings = getBindingsFromTypeAlias('StaticBindings');

      const foundModule: FoundModule = {
        name: 'StaticModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundModuleToProcessedBindings(foundModule, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('static');
      expect(result[0].impl.declaration.getName()).toBe('ITestService');
      expect(result[0].iface.declaration.getName()).toBe('ITestService');
    });

    it('should handle multiple bindings', () => {
      const bindings = getBindingsFromTypeAlias('MultiBindings');

      const foundModule: FoundModule = {
        name: 'MultiBindingModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundModuleToProcessedBindings(foundModule, project);

      expect(result).toHaveLength(3);

      const bindingNames = result.map(b => b.name);
      const bindingTypes = result.map(b => b.bindType);

      expect(bindingNames).toEqual(['repository', 'logger', 'config']);
      expect(bindingTypes).toEqual(['reusable', 'transient', 'static']);
    });

    it('should return empty array when no bindings property exists', () => {
      const foundModule: FoundModule = {
        name: 'EmptyModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        // No bindings property
      };

      const result = foundModuleToProcessedBindings(foundModule, project);

      expect(result).toEqual([]);
    });
  });

  describe('getBindingTypeFromProperty', () => {
    // This function is not exported, but we can test it indirectly through the main function
    it('should correctly identify reusable binding type', () => {
      const bindings = getBindingsFromTypeAlias('ReusableBindings');

      const foundModule: FoundModule = {
        name: 'ReusableModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundModuleToProcessedBindings(foundModule, project);
      expect(result[0].bindType).toBe('reusable');
    });

    it('should correctly identify transient binding type', () => {
      const bindings = getBindingsFromTypeAlias('TransientBindings');

      const foundModule: FoundModule = {
        name: 'TransientModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundModuleToProcessedBindings(foundModule, project);
      expect(result[0].bindType).toBe('transient');
    });

    it('should correctly identify static binding type', () => {
      const bindings = getBindingsFromTypeAlias('StaticBindings');

      const foundModule: FoundModule = {
        name: 'StaticModule',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundModuleToProcessedBindings(foundModule, project);
      expect(result[0].bindType).toBe('static');
    });
  });
});
