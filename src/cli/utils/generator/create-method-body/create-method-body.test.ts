import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import { createMethodBody as createMethodBodyFactory } from './create-method-body';
import {
  Binding,
  ProcessedContainer,
  ProcessedDependency,
} from '../../../types';
import { CodegenError } from '../../../error';
import path from 'path';
import { NoOpLogger } from '../../../logger';
import { normalizeTypeName } from '../../normalizeTypeName';

describe('createMethodBody', () => {
  let project: Project;
  let interfacesFile: SourceFile;
  let implementationsFile: SourceFile;
  let createMethodBody: ReturnType<typeof createMethodBodyFactory>;

  beforeEach(() => {
    // Tests use type-based resolution fallback, so empty map is fine
    createMethodBody = createMethodBodyFactory(NoOpLogger, new Map());

    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    interfacesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/interfaces.ts')
    );

    implementationsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/implementations.ts')
    );
  });

  const getProcessedBinding = (
    name: string,
    bindType: 'reusable' | 'transient' | 'static',
    className: string,
    interfaceName: string
  ): Binding => {
    const implClass = implementationsFile.getClass(className);
    const iface = interfacesFile.getInterface(interfaceName);

    if (!implClass) throw new Error(`Class ${className} not found`);
    if (!iface) throw new Error(`Interface ${interfaceName} not found`);

    if (bindType === 'static') {
      return {
        name,
        bindType,
        boundTo: {
          node: iface.getFirstChild()!, // This is a placeholder, actual tests might need adjustment
          typeText: interfaceName,
          usesTypeofKeyword: false,
          fqnOrLiteralTypeText: normalizeTypeName(
            iface.getSymbol()!.getFullyQualifiedName(),
            iface.getSourceFile()
          ),
        },
      };
    } else {
      return {
        name,
        bindType,
        boundTo: {
          node: iface.getFirstChild()!, // This is a placeholder
          typeText: interfaceName,
          usesTypeofKeyword: false,
          fqnOrLiteralTypeText: normalizeTypeName(
            iface.getSymbol()!.getFullyQualifiedName(),
            iface.getSourceFile()
          ),
        },
        implementedBy: {
          node: implClass.getFirstChild()! as any, // Placeholder TypeNode
          typeText: className,
          usesTypeofKeyword: false,
          isClass: true,
          parameters:
            implClass
              .getConstructors()[0]
              ?.getParameters()
              .map(param => ({
                name: param.getName(),
                node: param,
                usesTypeofKeyword: param.isKind(SyntaxKind.TypeQuery),
                fqnOrLiteralTypeText: normalizeTypeName(
                  param.getType().getText(),
                  param.getSourceFile()
                ),
              })) || [],
          fqn: implClass.getSymbol()!.getFullyQualifiedName(),
        },
      };
    }
  };

  const getProcessedDependency = (
    name: string,
    interfaceName: string
  ): ProcessedDependency => {
    const iface = interfacesFile.getInterface(interfaceName);

    if (!iface) throw new Error(`Interface ${interfaceName} not found`);

    return {
      text: name,
      type: iface.getType(),
    };
  };

  describe('static bindings', () => {
    it('should return static property access for static bindings', () => {
      const binding = getProcessedBinding(
        'testBinding',
        'static',
        'Service',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [binding],
      };

      const result = createMethodBody(module, binding);

      expect(result).toBe('return this.__static.testBinding;');
    });
  });

  describe('reusable bindings', () => {
    it('should add cache check for reusable bindings with no constructor params', () => {
      const binding = getProcessedBinding(
        'testBinding',
        'reusable',
        'ServiceWithNoParams',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [binding],
      };

      const result = createMethodBody(module, binding);

      expect(result).toBe(
        'if (this.__reusable.testBinding) return this.__reusable.testBinding;\n' +
          'const result = new ServiceWithNoParams();\n' +
          'this.__reusable.testBinding = result;\n' +
          'return result;'
      );
    });

    it('should handle reusable bindings with constructor parameters', () => {
      const repoBinding = getProcessedBinding(
        'repoBinding',
        'transient',
        'Repository',
        'IRepository'
      );
      const serviceBinding = getProcessedBinding(
        'serviceBinding',
        'reusable',
        'ServiceWithOneParam',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [repoBinding, serviceBinding],
      };

      const result = createMethodBody(module, serviceBinding);

      expect(result).toBe(
        'if (this.__reusable.serviceBinding) return this.__reusable.serviceBinding;\n' +
          'const result = new ServiceWithOneParam(this.repoBinding());\n' +
          'this.__reusable.serviceBinding = result;\n' +
          'return result;'
      );
    });
  });

  describe('transient bindings', () => {
    it('should create new instance without caching for transient bindings', () => {
      const binding = getProcessedBinding(
        'testBinding',
        'transient',
        'ServiceWithNoParams',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [binding],
      };

      const result = createMethodBody(module, binding);

      expect(result).toBe(
        'const result = new ServiceWithNoParams();\n' + 'return result;'
      );
    });
  });

  describe('constructor parameter resolution', () => {
    it('should resolve parameters from module bindings first', () => {
      const repoBinding = getProcessedBinding(
        'repoBinding',
        'transient',
        'Repository',
        'IRepository'
      );
      const serviceBinding = getProcessedBinding(
        'serviceBinding',
        'transient',
        'ServiceWithOneParam',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [repoBinding, serviceBinding],
      };

      const result = createMethodBody(module, serviceBinding);

      expect(result).toBe(
        'const result = new ServiceWithOneParam(this.repoBinding());\n' +
          'return result;'
      );
    });

    it('should resolve parameters from dependencies when not found in module bindings', () => {
      const dependency = getProcessedDependency(
        'TestDep',
        'IDependencyContainer'
      );
      const serviceBinding = getProcessedBinding(
        'serviceBinding',
        'transient',
        'ServiceWithOneParam',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [dependency],
        bindings: [serviceBinding],
      };

      const result = createMethodBody(module, serviceBinding);

      expect(result).toBe(
        'const result = new ServiceWithOneParam(this.__modules[0].getRepository());\n' +
          'return result;'
      );
    });

    it('should handle multiple constructor parameters', () => {
      const repoBinding = getProcessedBinding(
        'repoBinding',
        'transient',
        'Repository',
        'IRepository'
      );

      const dependency = getProcessedDependency(
        'TestDep',
        'IDependencyContainer'
      );

      // Create a service that needs both repository and logger
      const serviceClass = implementationsFile.getClass('Service');
      const serviceInterface = interfacesFile.getInterface('IService');

      if (!serviceClass || !serviceInterface) {
        throw new Error('Required classes/interfaces not found');
      }

      const serviceBinding: Binding = {
        name: 'serviceBinding',
        bindType: 'transient',
        boundTo: {
          node: serviceInterface.getFirstChild()!,
          typeText: 'IService',
          usesTypeofKeyword: false,
          fqnOrLiteralTypeText: serviceInterface
            .getSymbol()!
            .getFullyQualifiedName(),
        },
        implementedBy: {
          node: serviceClass.getFirstChild()! as any, // Placeholder TypeNode
          typeText: 'Service',
          usesTypeofKeyword: false,
          isClass: true,
          parameters:
            serviceClass
              .getConstructors()[0]
              ?.getParameters()
              .map(param => ({
                name: param.getName(),
                node: param,
                usesTypeofKeyword: param.isKind(SyntaxKind.TypeQuery),
                fqnOrLiteralTypeText: normalizeTypeName(
                  param.getType().getText(),
                  param.getSourceFile()
                ),
              })) || [],
          fqn: serviceClass.getSymbol()!.getFullyQualifiedName(),
        },
      };

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [dependency],
        bindings: [repoBinding, serviceBinding],
      };

      const result = createMethodBody(module, serviceBinding);

      // Service constructor expects (repo: IRepository, logger: ILogger)
      // Repository should come from local binding, Logger should come from dependency
      expect(result).toContain('new Service(this.repoBinding(),');
      expect(result).toContain('this.__modules[0].getLogger()');
    });
  });

  describe('error handling', () => {
    it('should throw CodegenError when parameter cannot be resolved', () => {
      const serviceBinding = getProcessedBinding(
        'serviceBinding',
        'transient',
        'ServiceWithOneParam',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [serviceBinding], // Missing repository binding
      };

      expect(() => createMethodBody(module, serviceBinding)).toThrow(
        CodegenError
      );
      expect(() => createMethodBody(module, serviceBinding)).toThrow(
        /Container `TestContainer` cannot be built:[\s\S]*Parameter `repo` of `ServiceWithOneParam` cannot be resolved./
      );
    });

    it('should throw CodegenError when dependency property is not a property signature', () => {
      // Create a dependency with an invalid property structure - using a separate file name
      const invalidDepsFile = project.createSourceFile(
        'invalid-deps.ts',
        `
        export interface InvalidDependencyContainer {
          invalidProp: string; // Not a method signature
        }
      `
      );

      const invalidInterface = invalidDepsFile.getInterface(
        'InvalidDependencyContainer'
      );
      if (!invalidInterface) throw new Error('Invalid interface not found');

      const invalidDependency: ProcessedDependency = {
        text: 'InvalidDep',
        type: invalidInterface.getType(),
      };

      const serviceBinding = getProcessedBinding(
        'serviceBinding',
        'transient',
        'ServiceWithOneParam',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [invalidDependency],
        bindings: [serviceBinding],
      };

      expect(() => createMethodBody(module, serviceBinding)).toThrow(
        CodegenError
      );
      expect(() => createMethodBody(module, serviceBinding)).toThrow(
        'Expected a method signature with a return type for `InvalidDep.invalidProp`'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle classes with no constructors', () => {
      const binding = getProcessedBinding(
        'testBinding',
        'transient',
        'ServiceWithNoConstructor',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [binding],
      };

      const result = createMethodBody(module, binding);

      expect(result).toBe(
        'const result = new ServiceWithNoConstructor();\n' + 'return result;'
      );
    });

    it('should handle empty constructor parameters', () => {
      const binding = getProcessedBinding(
        'testBinding',
        'transient',
        'ServiceWithNoParams',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [],
        bindings: [binding],
      };

      const result = createMethodBody(module, binding);

      expect(result).toBe(
        'const result = new ServiceWithNoParams();\n' + 'return result;'
      );
    });

    it('should prioritize module bindings over dependency bindings', () => {
      const localRepoBinding = getProcessedBinding(
        'localRepo',
        'transient',
        'Repository',
        'IRepository'
      );
      const dependency = getProcessedDependency(
        'TestDep',
        'IDependencyContainer'
      );
      const serviceBinding = getProcessedBinding(
        'serviceBinding',
        'transient',
        'ServiceWithOneParam',
        'IService'
      );

      const module: ProcessedContainer = {
        name: 'TestContainer',
        dependencies: [dependency],
        bindings: [localRepoBinding, serviceBinding],
      };

      const result = createMethodBody(module, serviceBinding);

      // Should use local binding, not dependency
      expect(result).toBe(
        'const result = new ServiceWithOneParam(this.localRepo());\n' +
          'return result;'
      );
    });
  });
});
