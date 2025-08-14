import { Project, SourceFile, SyntaxKind, TypeLiteralNode } from 'ts-morph';

import { FoundContainer } from '../../../types';
import { CodegenError } from '../../../error';
import path from 'path';
import { foundContainerToProcessedBindings } from './process-bindings';

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

  describe('foundContainerToProcessedBindings', () => {
    it('should process reusable bindings with single type argument', () => {
      const bindings = getBindingsFromTypeAlias('ReusableBindings');

      const foundContainer: FoundContainer = {
        name: 'ReusableContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      // Let the real resolve functions work with the fixture types
      const result = foundContainerToProcessedBindings(foundContainer, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('reusable');
      expect(result[0].impl.fqn).toMatch(/test-modules"\.TestService$/);
      expect(result[0].iface.fqn).toMatch(/test-modules"\.TestService$/);
    });

    it('should process transient bindings with two type arguments', () => {
      const bindings = getBindingsFromTypeAlias('TransientBindings');

      const foundContainer: FoundContainer = {
        name: 'TransientContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('transient');
      expect(result[0].impl.fqn).toMatch(/test-modules"\.TestService$/);
      expect(result[0].iface.fqn).toMatch(/test-modules"\.ITestService$/);
    });

    it('should process static bindings', () => {
      const bindings = getBindingsFromTypeAlias('StaticBindings');

      const foundContainer: FoundContainer = {
        name: 'StaticContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('static');
      expect(result[0].impl.fqn).toMatch(/test-modules"\.ITestService$/);
      expect(result[0].iface.fqn).toMatch(/test-modules"\.ITestService$/);
    });

    it('should handle bindings with factory functions', () => {
      const bindings = getBindingsFromTypeAlias('FunctionBindings');

      const foundContainer: FoundContainer = {
        name: 'FunctionContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('testService');
      expect(result[0].bindType).toBe('transient');
      expect(result[0].impl.fqn).toMatch(/test-modules"\.itsAFactoryFunction$/);
      expect(result[0].iface.fqn).toMatch(
        /test-modules"\.itsAFactoryFunction$/
      );
    });

    it('should handle multiple bindings', () => {
      const bindings = getBindingsFromTypeAlias('MultiBindings');

      const foundContainer: FoundContainer = {
        name: 'MultiBindingContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);

      expect(result).toHaveLength(3);

      const bindingNames = result.map(b => b.name);
      const bindingTypes = result.map(b => b.bindType);

      expect(bindingNames).toEqual(['repository', 'logger', 'config']);
      expect(bindingTypes).toEqual(['reusable', 'transient', 'static']);
    });

    it('should return empty array when no bindings property exists', () => {
      const foundContainer: FoundContainer = {
        name: 'EmptyContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        // No bindings property
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);

      expect(result).toEqual([]);
    });

    it('should throw error when two bindings have the same interface type', () => {
      const bindings = getBindingsFromTypeAlias('DuplicateInterfaceBindings');

      const foundContainer: FoundContainer = {
        name: 'DuplicateContainer',
        filePath: path.join(
          __dirname,
          '__fixtures__/test-modules-dupe-binding.ts'
        ),
        bindings,
      };

      expect(() => {
        foundContainerToProcessedBindings(foundContainer, project);
      }).toThrow(CodegenError);

      try {
        foundContainerToProcessedBindings(foundContainer, project);
        fail('Expected CodegenError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CodegenError);
        expect((error as CodegenError).message).toContain(
          'Binding testService2 conflicts with testService1. Bindings on the same module must return unique type aliases.'
        );
      }
    });
  });

  describe('getBindingTypeFromProperty', () => {
    // This function is not exported, but we can test it indirectly through the main function
    it('should correctly identify reusable binding type', () => {
      const bindings = getBindingsFromTypeAlias('ReusableBindings');

      const foundContainer: FoundContainer = {
        name: 'ReusableContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);
      expect(result[0].bindType).toBe('reusable');
    });

    it('should correctly identify transient binding type', () => {
      const bindings = getBindingsFromTypeAlias('TransientBindings');

      const foundContainer: FoundContainer = {
        name: 'TransientContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);
      expect(result[0].bindType).toBe('transient');
    });

    it('should correctly identify static binding type', () => {
      const bindings = getBindingsFromTypeAlias('StaticBindings');

      const foundContainer: FoundContainer = {
        name: 'StaticContainer',
        filePath: path.join(__dirname, '__fixtures__/test-modules.ts'),
        bindings,
      };

      const result = foundContainerToProcessedBindings(foundContainer, project);
      expect(result[0].bindType).toBe('static');
    });
  });
});
