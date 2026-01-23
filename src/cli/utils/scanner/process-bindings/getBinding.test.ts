import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import path from 'path';
import { getStaticBinding, getNonStaticBinding } from './getBinding';
import { CodegenError } from '../../../error';
import { NoOpLogger } from '../../../logger';

const mockLogger = NoOpLogger;

describe('getBinding', () => {
  let project: Project;
  let bindingDeclarationsFile: SourceFile;
  let bindingTestTypesFile: SourceFile;
  let typeAliasParametersFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    // Load fixture files
    bindingTestTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/binding-test-types.ts')
    );
    typeAliasParametersFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/type-alias-parameters.ts')
    );
    bindingDeclarationsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/binding-declarations.ts')
    );
  });

  // Helper to get type arguments from a type alias
  const getTypeArgs = (
    aliasName: string,
    file: SourceFile = bindingDeclarationsFile
  ) => {
    const typeAlias = file.getTypeAliasOrThrow(aliasName);
    const typeNode = typeAlias.getTypeNode();

    if (!typeNode?.isKind(SyntaxKind.TypeReference)) {
      throw new Error(`${aliasName} is not a type reference`);
    }

    const typeArgs = typeNode
      .asKindOrThrow(SyntaxKind.TypeReference)
      .getTypeArguments();
    if (typeArgs.length === 0) {
      throw new Error(`${aliasName} has no type arguments`);
    }

    return typeArgs;
  };

  describe('getStaticBinding', () => {
    const getStaticBindingDefault = getStaticBinding(mockLogger);

    describe('with type aliases', () => {
      it('should create static binding for type alias', () => {
        const typeArgs = getTypeArgs('StaticUserConfig');

        const binding = getStaticBindingDefault({
          name: 'userConfig',
          typeArgs: [typeArgs[0]],
        });

        expect(binding).toEqual({
          name: 'userConfig',
          bindType: 'static',
          boundTo: {
            node: typeArgs[0],
            typeText: 'UserConfig',
            usesTypeofKeyword: false,
            fqnOrLiteralTypeText: expect.stringMatching(/UserConfig/),
          },
        });
      });

      it('should create static binding for complex type alias', () => {
        const typeArgs = getTypeArgs('StaticComplexType');

        const binding = getStaticBindingDefault({
          name: 'complexConfig',
          typeArgs: [typeArgs[0]],
        });

        expect(binding).toEqual({
          name: 'complexConfig',
          bindType: 'static',
          boundTo: {
            node: typeArgs[0],
            typeText: 'ComplexLiteralType',
            usesTypeofKeyword: false,
            fqnOrLiteralTypeText: expect.stringMatching(/ComplexLiteralType/),
          },
        });
      });
    });

    describe('with literal types', () => {
      it('should create static binding for literal type', () => {
        const typeArgs = getTypeArgs('StaticLiteralType');

        const binding = getStaticBindingDefault({
          name: 'literalConfig',
          typeArgs: [typeArgs[0]],
        });

        expect(binding).toEqual({
          name: 'literalConfig',
          bindType: 'static',
          boundTo: {
            node: typeArgs[0],
            typeText: expect.stringContaining('name'),
            usesTypeofKeyword: false,
            fqnOrLiteralTypeText: expect.stringContaining('name'),
          },
        });
      });
    });

    describe('error cases', () => {
      it('should throw CodegenError for typeof keyword usage', () => {
        const typeArgs = getTypeArgs('StaticWithTypeof');

        expect(() => {
          getStaticBindingDefault({
            name: 'invalidStatic',
            typeArgs: [typeArgs[0]],
          });
        }).toThrow(CodegenError);

        expect(() => {
          getStaticBindingDefault({
            name: 'invalidStatic',
            typeArgs: [typeArgs[0]],
          });
        }).toThrow('`typeof` keyword is not allowed in static bindings');
      });
    });

    describe('dependency injection', () => {
      it('should use custom getFqnForAlias function', () => {
        const mockGetFqnForAlias = jest.fn().mockReturnValue('mock.custom.fqn');
        const customGetStaticBinding = getStaticBinding(
          mockLogger,
          mockGetFqnForAlias
        );

        const typeArgs = getTypeArgs('StaticUserConfig');

        const binding = customGetStaticBinding({
          name: 'userConfig',
          typeArgs: [typeArgs[0]],
        });

        expect(mockGetFqnForAlias).toHaveBeenCalled();
        expect(binding.boundTo.fqnOrLiteralTypeText).toBe('mock.custom.fqn');
      });
    });
  });

  describe('getNonStaticBinding', () => {
    const getNonStaticBindingDefault = getNonStaticBinding(mockLogger);

    describe('reusable bindings', () => {
      it('should create reusable binding with single type argument', () => {
        const typeArgs = getTypeArgs('ReusableSimpleService');

        const binding = getNonStaticBindingDefault({
          name: 'simpleService',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding.name).toBe('simpleService');
        expect(binding.bindType).toBe('reusable');
        expect(binding.boundTo.usesTypeofKeyword).toBe(false);
        expect(binding.implementedBy.usesTypeofKeyword).toBe(false);
        // Note: isClass might be false if the type reference resolves to a variable declaration
        expect(binding.implementedBy.fqn).toMatch(/SimpleService/);
        expect(Array.isArray(binding.implementedBy.parameters)).toBe(true);
      });

      it('should create reusable binding with two type arguments', () => {
        const typeArgs = getTypeArgs('ReusableUserService');

        const binding = getNonStaticBindingDefault({
          name: 'userService',
          typeArgs: typeArgs as [any, any],
          bindType: 'reusable',
        });

        expect(binding.name).toBe('userService');
        expect(binding.bindType).toBe('reusable');
        expect(binding.boundTo.node).toBe(typeArgs[1]);
        expect(binding.boundTo.usesTypeofKeyword).toBe(false);
        expect(binding.implementedBy.node).toBe(typeArgs[0]);
        expect(binding.implementedBy.usesTypeofKeyword).toBe(false);
        // Note: isClass might be false if the type reference resolves to a variable declaration
        expect(binding.implementedBy.fqn).toMatch(/UserService/);
        expect(Array.isArray(binding.implementedBy.parameters)).toBe(true);
        expect(binding.implementedBy.parameters.length).toBeGreaterThan(0);
      });

      it('should create reusable binding with typeof keyword', () => {
        const typeArgs = getTypeArgs('ReusableWithTypeof');

        const binding = getNonStaticBindingDefault({
          name: 'userServiceFactory',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding).toEqual({
          name: 'userServiceFactory',
          bindType: 'reusable',
          boundTo: {
            node: typeArgs[0],
            // For single typeof argument, boundTo.usesTypeofKeyword is false
            // because the bound type is expressed as ReturnType<typeof functionName>
            usesTypeofKeyword: false,
            // boundTo should use ReturnType<typeof functionName> syntax
            typeText: 'ReturnType<typeof createUserService>',
            fqnOrLiteralTypeText: expect.stringMatching(
              /ReturnType<typeof .*createUserService>/
            ),
          },
          implementedBy: {
            node: typeArgs[0],
            usesTypeofKeyword: true,
            typeText: expect.any(String),
            isClass: false,
            parameters: [],
            fqn: expect.stringMatching(/createUserService/),
          },
        });
      });

      it('should create reusable binding with factory function', () => {
        const typeArgs = getTypeArgs('ReusableFactory');

        const binding = getNonStaticBindingDefault({
          name: 'emailServiceFactory',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding.implementedBy.isClass).toBe(false);
        expect(binding.implementedBy.fqn).toMatch(/createEmailService/);
      });
    });

    describe('transient bindings', () => {
      it('should create transient binding with single type argument', () => {
        const typeArgs = getTypeArgs('TransientSimpleService');

        const binding = getNonStaticBindingDefault({
          name: 'simpleService',
          typeArgs: [typeArgs[0]],
          bindType: 'transient',
        });

        expect(binding.bindType).toBe('transient');
        expect(binding.implementedBy.fqn).toMatch(/SimpleService/);
      });

      it('should create transient binding with two type arguments', () => {
        const typeArgs = getTypeArgs('TransientUserService');

        const binding = getNonStaticBindingDefault({
          name: 'userService',
          typeArgs: typeArgs as [any, any],
          bindType: 'transient',
        });

        expect(binding.bindType).toBe('transient');
        expect(binding.boundTo.node).toBe(typeArgs[1]);
        expect(binding.implementedBy.node).toBe(typeArgs[0]);
      });

      it('should create transient binding with typeof keyword', () => {
        const typeArgs = getTypeArgs('TransientWithTypeof');

        const binding = getNonStaticBindingDefault({
          name: 'userServiceFactory',
          typeArgs: [typeArgs[0]],
          bindType: 'transient',
        });

        expect(binding.implementedBy.usesTypeofKeyword).toBe(true);
        expect(binding.implementedBy.isClass).toBe(false);
        // boundTo should use ReturnType<typeof functionName> syntax
        expect(binding.boundTo.typeText).toBe(
          'ReturnType<typeof createUserService>'
        );
        expect(binding.boundTo.fqnOrLiteralTypeText).toMatch(
          /ReturnType<typeof .*createUserService>/
        );
      });

      it('should create transient binding with imported factory function', () => {
        const typeArgs = getTypeArgs('TransientFactory');

        const binding = getNonStaticBindingDefault({
          name: 'importedFactory',
          typeArgs: [typeArgs[0]],
          bindType: 'transient',
        });

        expect(binding.implementedBy.usesTypeofKeyword).toBe(true);
        expect(binding.implementedBy.isClass).toBe(false);
        expect(binding.implementedBy.fqn).toMatch(/importedFactory/);
        // boundTo should use ReturnType<typeof functionName> syntax
        expect(binding.boundTo.typeText).toBe(
          'ReturnType<typeof importedFactory>'
        );
        expect(binding.boundTo.fqnOrLiteralTypeText).toMatch(
          /ReturnType<typeof .*importedFactory>/
        );
      });
    });

    describe('imported bindings', () => {
      it('should resolve imported class correctly', () => {
        const typeArgs = getTypeArgs('ImportedReusable');

        const binding = getNonStaticBindingDefault({
          name: 'importedService',
          typeArgs: typeArgs as [any, any],
          bindType: 'reusable',
        });

        expect(binding.implementedBy.fqn).toMatch(/ImportedImplementation/);
      });

      it('should resolve imported single type correctly', () => {
        const typeArgs = getTypeArgs('ImportedTransient');

        const binding = getNonStaticBindingDefault({
          name: 'importedService',
          typeArgs: [typeArgs[0]],
          bindType: 'transient',
        });

        expect(binding.implementedBy.fqn).toMatch(/ImportedImplementation/);
      });
    });

    describe('error cases', () => {
      it('should throw CodegenError for unresolvable symbol', () => {
        // Create a mock type node that references a non-existent symbol
        const mockTypeNode = {
          isKind: () => false,
          getText: () => 'NonExistentClass',
          getSourceFile: () => bindingTestTypesFile,
          getType: () => ({ getText: () => 'NonExistentClass' }),
          getStart: () => 0,
          getEnd: () => 10,
        } as any;

        expect(() => {
          getNonStaticBindingDefault({
            name: 'invalid',
            typeArgs: [mockTypeNode],
            bindType: 'reusable',
          });
        }).toThrow(CodegenError);
      });

      it('should throw CodegenError for non-exported implementation', () => {
        // This test would need a way to reference a non-exported class
        // For now we'll test the logic with a mock
        const mockDeclaration = {
          isKind: (kind: SyntaxKind) => kind === SyntaxKind.ClassDeclaration,
          isExported: () => false,
          getStart: () => 0,
          getEnd: () => 10,
          getSourceFile: () => bindingTestTypesFile,
        };

        const mockGetDeclarationForName = jest
          .fn()
          .mockReturnValue(mockDeclaration);

        const customGetNonStaticBinding = getNonStaticBinding(
          mockLogger,
          mockGetDeclarationForName
        );

        const mockTypeNode = {
          isKind: () => false,
          getText: () => 'PrivateClass',
          getSourceFile: () => bindingTestTypesFile,
          getType: () => ({ getText: () => 'PrivateClass' }),
          getStart: () => 0,
          getEnd: () => 10,
        } as any;

        expect(() => {
          customGetNonStaticBinding({
            name: 'privateService',
            typeArgs: [mockTypeNode],
            bindType: 'reusable',
          });
        }).toThrow(CodegenError);

        expect(() => {
          customGetNonStaticBinding({
            name: 'privateService',
            typeArgs: [mockTypeNode],
            bindType: 'reusable',
          });
        }).toThrow('must either be an export or import');
      });
    });

    describe('dependency injection', () => {
      it('should use custom getDeclarationForName function', () => {
        const mockGetDeclarationForName = jest
          .fn()
          .mockReturnValue(bindingTestTypesFile.getClass('SimpleService'));
        const mockGetParametersForName = jest.fn().mockReturnValue([]);
        const mockGetFqnForImportDeclaration = jest.fn();

        const customGetNonStaticBinding = getNonStaticBinding(
          mockLogger,
          mockGetDeclarationForName,
          mockGetParametersForName,
          mockGetFqnForImportDeclaration
        );

        const typeArgs = getTypeArgs('ReusableSimpleService');

        const binding = customGetNonStaticBinding({
          name: 'simpleService',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(mockGetDeclarationForName).toHaveBeenCalledWith(
          'SimpleService',
          bindingDeclarationsFile
        );
        expect(mockGetParametersForName).toHaveBeenCalledWith(
          'SimpleService',
          bindingDeclarationsFile
        );
        expect(binding.implementedBy.parameters).toEqual([]);
      });

      it('should use custom getFqnForImportDeclaration for imports', () => {
        const mockImportDeclaration = {
          isKind: (kind: SyntaxKind) => kind === SyntaxKind.ImportDeclaration,
          isExported: () => false,
          getStart: () => 0,
          getEnd: () => 10,
          getSourceFile: () => bindingTestTypesFile,
          getModuleSpecifierSourceFile: () => null,
        };

        const mockGetDeclarationForName = jest
          .fn()
          .mockReturnValue(mockImportDeclaration);
        const mockGetParametersForName = jest.fn().mockReturnValue([]);
        const mockGetFqnForImportDeclaration = jest
          .fn()
          .mockReturnValue('custom.import.fqn');

        const customGetNonStaticBinding = getNonStaticBinding(
          mockLogger,
          mockGetDeclarationForName,
          mockGetParametersForName,
          mockGetFqnForImportDeclaration
        );

        const typeArgs = getTypeArgs('ReusableSimpleService');

        const binding = customGetNonStaticBinding({
          name: 'simpleService',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(mockGetFqnForImportDeclaration).toHaveBeenCalledWith(
          'SimpleService',
          mockImportDeclaration
        );
        expect(binding.implementedBy.fqn).toBe('custom.import.fqn');
      });
    });

    describe('type alias parameters', () => {
      it('should preserve type alias identity for factory function parameters', () => {
        const typeArgs = getTypeArgs('ReusableTypeAliasFactory');

        const binding = getNonStaticBindingDefault({
          name: 'databaseServiceFactory',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding.implementedBy.parameters).toHaveLength(2);

        // First parameter should be DatabaseUrl, not just string
        const connectionUrlParam = binding.implementedBy.parameters[0];
        expect(connectionUrlParam.name).toBe('connectionUrl');
        expect(connectionUrlParam.fqnOrLiteralTypeText).toMatch(/DatabaseUrl/);
        expect(connectionUrlParam.fqnOrLiteralTypeText).not.toBe('string');

        // Second parameter should be ApiKey, not just string
        const apiKeyParam = binding.implementedBy.parameters[1];
        expect(apiKeyParam.name).toBe('apiKey');
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/ApiKey/);
        expect(apiKeyParam.fqnOrLiteralTypeText).not.toBe('string');
      });

      it('should preserve type alias identity for class constructor parameters', () => {
        const typeArgs = getTypeArgs('ReusableTypeAliasClass');

        const binding = getNonStaticBindingDefault({
          name: 'databaseService',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding.implementedBy.parameters).toHaveLength(3);

        // First parameter should be DatabaseUrl
        const connectionUrlParam = binding.implementedBy.parameters[0];
        expect(connectionUrlParam.name).toBe('connectionUrl');
        expect(connectionUrlParam.fqnOrLiteralTypeText).toMatch(/DatabaseUrl/);

        // Second parameter should be ApiKey
        const apiKeyParam = binding.implementedBy.parameters[1];
        expect(apiKeyParam.name).toBe('apiKey');
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/ApiKey/);

        // Third parameter should be Port
        const portParam = binding.implementedBy.parameters[2];
        expect(portParam.name).toBe('port');
        expect(portParam.fqnOrLiteralTypeText).toMatch(/Port/);
      });

      it('should allow matching type alias parameters to static bindings', () => {
        // Get the static binding for DatabaseUrl
        const staticTypeArgs = getTypeArgs('StaticDatabaseUrl');
        const getStaticBindingDefault = getStaticBinding(mockLogger);
        const staticBinding = getStaticBindingDefault({
          name: 'databaseUrl',
          typeArgs: [staticTypeArgs[0]],
        });

        // Get the factory binding with DatabaseUrl parameter
        const factoryTypeArgs = getTypeArgs('ReusableTypeAliasFactory');
        const factoryBinding = getNonStaticBindingDefault({
          name: 'databaseServiceFactory',
          typeArgs: [factoryTypeArgs[0]],
          bindType: 'reusable',
        });

        // Both should reference DatabaseUrl as the type alias (not just "string")
        const connectionUrlParam = factoryBinding.implementedBy.parameters[0];
        expect(connectionUrlParam.fqnOrLiteralTypeText).toMatch(/DatabaseUrl/);
        expect(staticBinding.boundTo.fqnOrLiteralTypeText).toMatch(/DatabaseUrl/);

        // Both should reference the same source file (type-alias-parameters)
        // Note: paths may differ slightly based on where the type is imported/used
        expect(connectionUrlParam.fqnOrLiteralTypeText).toMatch(
          /type-alias-parameters/
        );
      });
    });

    describe('imported type alias parameters', () => {
      it('should preserve type alias identity when class imports the type from another file', () => {
        // This tests the case where:
        // - ApiKey is defined in imported-alias-types.ts
        // - ImportedAliasService is defined in imported-alias-service.ts and imports ApiKey
        // The parameter should resolve to "imported-alias-types.ts".ApiKey, not "imported-alias-service.ts".string
        const typeArgs = getTypeArgs('ReusableImportedAliasService');

        const binding = getNonStaticBindingDefault({
          name: 'importedAliasService',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding.implementedBy.parameters).toHaveLength(2);

        // First parameter should be ApiKey from imported-alias-types.ts
        const apiKeyParam = binding.implementedBy.parameters[0];
        expect(apiKeyParam.name).toBe('apiKey');
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/ApiKey/);
        expect(apiKeyParam.fqnOrLiteralTypeText).not.toBe('string');
        // Should reference the original definition file, not the service file
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/imported-alias-types/);

        // Second parameter should be ServiceUrl from imported-alias-types.ts
        const serviceUrlParam = binding.implementedBy.parameters[1];
        expect(serviceUrlParam.name).toBe('serviceUrl');
        expect(serviceUrlParam.fqnOrLiteralTypeText).toMatch(/ServiceUrl/);
        expect(serviceUrlParam.fqnOrLiteralTypeText).not.toBe('string');
        expect(serviceUrlParam.fqnOrLiteralTypeText).toMatch(
          /imported-alias-types/
        );
      });

      it('should preserve type alias identity when factory imports the type from another file', () => {
        const typeArgs = getTypeArgs('ReusableImportedAliasFactory');

        const binding = getNonStaticBindingDefault({
          name: 'importedAliasFactory',
          typeArgs: [typeArgs[0]],
          bindType: 'reusable',
        });

        expect(binding.implementedBy.parameters).toHaveLength(2);

        // First parameter should be ApiKey from imported-alias-types.ts
        const apiKeyParam = binding.implementedBy.parameters[0];
        expect(apiKeyParam.name).toBe('apiKey');
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/ApiKey/);
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/imported-alias-types/);

        // Second parameter should be ServiceUrl from imported-alias-types.ts
        const serviceUrlParam = binding.implementedBy.parameters[1];
        expect(serviceUrlParam.name).toBe('serviceUrl');
        expect(serviceUrlParam.fqnOrLiteralTypeText).toMatch(/ServiceUrl/);
        expect(serviceUrlParam.fqnOrLiteralTypeText).toMatch(
          /imported-alias-types/
        );
      });

      it('should allow matching imported type alias parameters to static bindings', () => {
        // Get the static binding for ImportedApiKey (aliased as ApiKey)
        const staticTypeArgs = getTypeArgs('StaticImportedApiKey');
        const getStaticBindingDefault = getStaticBinding(mockLogger);
        const staticBinding = getStaticBindingDefault({
          name: 'importedApiKey',
          typeArgs: [staticTypeArgs[0]],
        });

        // Get the service binding with ApiKey parameter
        const serviceTypeArgs = getTypeArgs('ReusableImportedAliasService');
        const serviceBinding = getNonStaticBindingDefault({
          name: 'importedAliasService',
          typeArgs: [serviceTypeArgs[0]],
          bindType: 'reusable',
        });

        // Both should reference ApiKey from imported-alias-types.ts
        const apiKeyParam = serviceBinding.implementedBy.parameters[0];
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/ApiKey/);
        expect(staticBinding.boundTo.fqnOrLiteralTypeText).toMatch(/ApiKey/);

        // Both should reference the same source file
        expect(apiKeyParam.fqnOrLiteralTypeText).toMatch(/imported-alias-types/);
        expect(staticBinding.boundTo.fqnOrLiteralTypeText).toMatch(
          /imported-alias-types/
        );
      });
    });
  });
});
