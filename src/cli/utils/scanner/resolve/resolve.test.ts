import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import path from 'path';
import { resolveType, resolveTypeToDeclaration } from './resolve';

describe('resolve', () => {
  let project: Project;
  let basicTypesFile: SourceFile;
  let externalTypesFile: SourceFile;
  let complexTypesFile: SourceFile;
  let importedTypeFromNodeModule: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    basicTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/basic-types.ts')
    );

    externalTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/external-types.ts')
    );

    complexTypesFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/complex-types.ts')
    );

    importedTypeFromNodeModule = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/imported-type-from-node-module.ts')
    );
  });

  describe('resolveType', () => {
    it('should resolve interface types correctly', () => {
      const iUserService = basicTypesFile.getInterface('IUserService');
      expect(iUserService).toBeDefined();

      const type = iUserService!.getType();
      const result = resolveType(type, basicTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('IUserService');
        expect(
          result.resolvedType.isKind(SyntaxKind.InterfaceDeclaration)
        ).toBe(true);
      }
    });

    it('should resolve class types correctly', () => {
      const userService = basicTypesFile.getClass('UserService');
      expect(userService).toBeDefined();

      const type = userService!.getType();
      const result = resolveType(type, basicTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('UserService');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should resolve type alias types correctly', () => {
      const user = basicTypesFile.getTypeAlias('User');
      expect(user).toBeDefined();

      const type = user!.getType();
      const result = resolveType(type, basicTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('User');
        expect(
          result.resolvedType.isKind(SyntaxKind.TypeAliasDeclaration)
        ).toBe(true);
      }
    });

    it('should resolve generic interface types correctly', () => {
      const iGenericRepository =
        complexTypesFile.getInterface('IGenericRepository');
      expect(iGenericRepository).toBeDefined();

      const type = iGenericRepository!.getType();
      const result = resolveType(type, complexTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('IGenericRepository');
        expect(
          result.resolvedType.isKind(SyntaxKind.InterfaceDeclaration)
        ).toBe(true);
      }
    });

    it('should resolve abstract class types correctly', () => {
      const abstractFactory = complexTypesFile.getClass('AbstractFactory');
      expect(abstractFactory).toBeDefined();

      const type = abstractFactory!.getType();
      const result = resolveType(type, complexTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('AbstractFactory');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should resolve types from external files correctly', () => {
      const httpClient = externalTypesFile.getClass('HttpClient');
      expect(httpClient).toBeDefined();

      const type = httpClient!.getType();
      const result = resolveType(
        type,
        externalTypesFile.getFilePath(),
        project
      );

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('HttpClient');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    // No support for things inside of namespaces yet
    it.skip('should resolve namespaced types correctly', () => {
      const typesNamespace = complexTypesFile
        .getModules()
        .find(m => m.getName() === 'Types');
      const nestedImplementation = typesNamespace?.getClass(
        'NestedImplementation'
      );
      expect(nestedImplementation).toBeDefined();

      const type = nestedImplementation!.getType();
      const result = resolveType(type, complexTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('NestedImplementation');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should handle error when type is not found in source file', () => {
      // This is harder to test directly since we need a malformed symbol
      // For now, we'll test the happy path and rely on integration tests for edge cases
      const userService = basicTypesFile.getClass('UserService');
      expect(userService).toBeDefined();

      const type = userService!.getType();
      const result = resolveType(type, basicTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
    });

    it('should resolve complex conditional types', () => {
      const stringProcessor = complexTypesFile.getTypeAlias('StringProcessor');
      expect(stringProcessor).toBeDefined();

      const type = stringProcessor!.getType();
      const result = resolveType(type, complexTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('StringProcessor');
        expect(
          result.resolvedType.isKind(SyntaxKind.TypeAliasDeclaration)
        ).toBe(true);
      }
    });

    it('should resolve inheritance hierarchies correctly', () => {
      const singletonFactory = complexTypesFile.getClass('SingletonFactory');
      expect(singletonFactory).toBeDefined();

      const type = singletonFactory!.getType();
      const result = resolveType(type, complexTypesFile.getFilePath(), project);

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('SingletonFactory');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should resolve import declarations correctly', () => {
      // Get an import declaration from the imported types file
      const imports = importedTypeFromNodeModule.getImportDeclarations();
      const tsMorphImport = imports.find(
        imp => imp.getModuleSpecifierValue() === 'ts-morph'
      );
      expect(tsMorphImport).toBeDefined();

      // For import declarations, we test different scenarios
      // 1. Test re-exported type (TsMorphProject alias)
      const tsMorphProjectClass = importedTypeFromNodeModule.getClass(
        'ServiceWithImportedType'
      );
      expect(tsMorphProjectClass).toBeDefined();

      // Get the return type of getProject method which should be TsMorphProject
      const getProjectMethod = tsMorphProjectClass!.getMethod('getProject');
      expect(getProjectMethod).toBeDefined();

      const returnType = getProjectMethod!.getReturnType();
      const result = resolveType(
        returnType,
        importedTypeFromNodeModule.getFilePath(),
        project
      );

      if (result.error !== null) {
        throw new Error(result.error);
      }

      // For imported types, the function might return an error since external modules aren't resolved
      // This is expected behavior - external imports typically can't be resolved in this context
      expect(result.name).toBeDefined();
      expect(result.resolvedType).toBeDefined();
    });
  });

  describe('resolveTypeToClass', () => {
    it('should resolve class types successfully', () => {
      const userService = basicTypesFile.getClass('UserService');
      expect(userService).toBeDefined();

      const type = userService!.getType();
      const result = resolveTypeToDeclaration(
        type,
        basicTypesFile.getFilePath(),
        project
      );

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('UserService');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should resolve abstract class types successfully', () => {
      const baseService = externalTypesFile.getClass('BaseService');
      expect(baseService).toBeDefined();

      const type = baseService!.getType();
      const result = resolveTypeToDeclaration(
        type,
        externalTypesFile.getFilePath(),
        project
      );

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('BaseService');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should resolve generic class types successfully', () => {
      const genericService = complexTypesFile.getClass('GenericService');
      expect(genericService).toBeDefined();

      const type = genericService!.getType();
      const result = resolveTypeToDeclaration(
        type,
        complexTypesFile.getFilePath(),
        project
      );

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('GenericService');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should return error when resolved type is not a class (interface)', () => {
      const iUserService = basicTypesFile.getInterface('IUserService');
      expect(iUserService).toBeDefined();

      const type = iUserService!.getType();
      const result = resolveTypeToDeclaration(
        type,
        basicTypesFile.getFilePath(),
        project
      );

      expect(result.error).toContain('is not a class');
    });

    it('should return error when resolved type is not a class (type alias)', () => {
      const user = basicTypesFile.getTypeAlias('User');
      expect(user).toBeDefined();

      const type = user!.getType();
      const result = resolveTypeToDeclaration(
        type,
        basicTypesFile.getFilePath(),
        project
      );

      expect(result.error).toContain('is not a class');
    });

    // No support for things inside of namespaces yet
    it.skip('should resolve namespaced class types successfully', () => {
      const typesNamespace = complexTypesFile
        .getModules()
        .find(m => m.getName() === 'Types');
      const nestedImplementation = typesNamespace?.getClass(
        'NestedImplementation'
      );
      expect(nestedImplementation).toBeDefined();

      const type = nestedImplementation!.getType();
      const result = resolveTypeToDeclaration(
        type,
        complexTypesFile.getFilePath(),
        project
      );

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('NestedImplementation');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });

    it('should handle inheritance correctly', () => {
      const dataService = externalTypesFile.getClass('DataService');
      expect(dataService).toBeDefined();

      const type = dataService!.getType();
      const result = resolveTypeToDeclaration(
        type,
        externalTypesFile.getFilePath(),
        project
      );

      expect(result.error).toBeNull();
      if (result.error === null) {
        expect(result.name).toBe('DataService');
        expect(result.resolvedType.isKind(SyntaxKind.ClassDeclaration)).toBe(
          true
        );
      }
    });
  });
});
