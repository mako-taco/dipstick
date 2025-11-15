import { Project, SourceFile } from 'ts-morph';
import path from 'path';
import { getParametersForName } from './getParametersForName';
import { CodegenError } from '../error';

describe('getParametersForName', () => {
  let project: Project;
  let parameterDeclarationsFile: SourceFile;
  let importedFunctionsFile: SourceFile;
  let withParameterImportsFile: SourceFile;
  let getParameters: ReturnType<typeof getParametersForName>;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    // Load fixture files
    parameterDeclarationsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/parameter-declarations.ts')
    );
    importedFunctionsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/imported-functions.ts')
    );
    withParameterImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/with-parameter-imports.ts')
    );

    getParameters = getParametersForName();
  });

  describe('function declarations', () => {
    it('should extract parameters from regular function', () => {
      const parameters = getParameters(
        'regularFunction',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
      expect(parameters[0].getTypeNode()?.getText()).toBe('string');
      expect(parameters[1].getName()).toBe('param2');
      expect(parameters[1].getTypeNode()?.getText()).toBe('number');
    });

    it('should return empty array for function without parameters', () => {
      const parameters = getParameters(
        'functionWithoutParams',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(0);
    });

    it('should handle optional parameters', () => {
      const parameters = getParameters(
        'functionWithOptionalParams',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('required');
      expect(parameters[0].hasQuestionToken()).toBe(false);
      expect(parameters[1].getName()).toBe('optional');
      expect(parameters[1].hasQuestionToken()).toBe(true);
    });

    it('should handle rest parameters', () => {
      const parameters = getParameters(
        'functionWithRestParams',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('first');
      expect(parameters[1].getName()).toBe('rest');
      expect(parameters[1].isRestParameter()).toBe(true);
    });
  });

  describe('variable declarations with arrow functions', () => {
    it('should extract parameters from arrow function', () => {
      const parameters = getParameters(
        'arrowFunction',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
      expect(parameters[0].getTypeNode()?.getText()).toBe('string');
      expect(parameters[1].getName()).toBe('param2');
      expect(parameters[1].getTypeNode()?.getText()).toBe('boolean');
    });
  });

  describe('variable declarations with function expressions', () => {
    it('should extract parameters from function expression', () => {
      const parameters = getParameters(
        'functionExpression',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
      expect(parameters[0].getTypeNode()?.getText()).toBe('number');
      expect(parameters[1].getName()).toBe('param2');
      expect(parameters[1].getTypeNode()?.getText()).toBe('string');
    });
  });

  describe('variable declarations with class expressions', () => {
    it('should extract constructor parameters from class expression', () => {
      const parameters = getParameters(
        'classExpression',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
      expect(parameters[0].getTypeNode()?.getText()).toBe('string');
      expect(parameters[1].getName()).toBe('param2');
      expect(parameters[1].getTypeNode()?.getText()).toBe('number');
    });

    it('should return empty array for class expression without constructor', () => {
      const parameters = getParameters(
        'classExpressionWithoutConstructor',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(0);
    });
  });

  describe('class declarations', () => {
    it('should extract constructor parameters from class declaration', () => {
      const parameters = getParameters(
        'RegularClass',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
      expect(parameters[0].getTypeNode()?.getText()).toBe('string');
      expect(parameters[1].getName()).toBe('param2');
      expect(parameters[1].getTypeNode()?.getText()).toBe('number');
    });

    it('should return empty array for class without constructor', () => {
      const parameters = getParameters(
        'ClassWithoutConstructor',
        parameterDeclarationsFile
      );

      expect(parameters).toHaveLength(0);
    });

    it('should return parameters from first constructor for class with multiple constructors', () => {
      const parameters = getParameters(
        'ClassWithMultipleConstructors',
        parameterDeclarationsFile
      );

      // Should get the actual implementation constructor (the one with body)
      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
      expect(parameters[1].getName()).toBe('param2');
    });
  });

  describe('import declarations', () => {
    it('should recursively resolve parameters from imported function', () => {
      const parameters = getParameters(
        'importedFunction',
        withParameterImportsFile
      );

      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('importedParam1');
      expect(parameters[0].getTypeNode()?.getText()).toBe('string');
      expect(parameters[1].getName()).toBe('importedParam2');
      expect(parameters[1].getTypeNode()?.getText()).toBe('boolean');
    });

    it('should recursively resolve parameters from imported class', () => {
      const parameters = getParameters(
        'ImportedClass',
        withParameterImportsFile
      );

      expect(parameters).toHaveLength(1);
      expect(parameters[0].getName()).toBe('importedClassParam');
      expect(parameters[0].getTypeNode()?.getText()).toBe('number');
    });

    it('should recursively resolve parameters from imported arrow function', () => {
      const parameters = getParameters(
        'importedArrowFunction',
        withParameterImportsFile
      );

      expect(parameters).toHaveLength(1);
      expect(parameters[0].getName()).toBe('arrowParam');
      expect(parameters[0].getTypeNode()?.getText()).toBe('string');
    });
  });

  describe('error cases', () => {
    it('should throw CodegenError for type alias declarations', () => {
      expect(() => {
        getParameters('MyType', parameterDeclarationsFile);
      }).toThrow(CodegenError);
      expect(() => {
        getParameters('MyType', parameterDeclarationsFile);
      }).toThrow('Type alias `MyType`');
    });

    it('should throw CodegenError for interface declarations', () => {
      expect(() => {
        getParameters('MyInterface', parameterDeclarationsFile);
      }).toThrow(CodegenError);
      expect(() => {
        getParameters('MyInterface', parameterDeclarationsFile);
      }).toThrow('Interface `MyInterface`');
    });

    it('should throw CodegenError for variable declaration without initializer', () => {
      expect(() => {
        getParameters('variableWithoutInitializer', parameterDeclarationsFile);
      }).toThrow(CodegenError);
      expect(() => {
        getParameters('variableWithoutInitializer', parameterDeclarationsFile);
      }).toThrow('lacks an initializer');
    });

    it('should throw CodegenError for variable with unsupported initializer', () => {
      expect(() => {
        getParameters('objectLiteral', parameterDeclarationsFile);
      }).toThrow(CodegenError);
      expect(() => {
        getParameters('objectLiteral', parameterDeclarationsFile);
      }).toThrow('Unknown initializer type');
    });

    it('should throw Error for unresolvable symbol', () => {
      expect(() => {
        getParameters('nonExistentSymbol', parameterDeclarationsFile);
      }).toThrow(Error);
      expect(() => {
        getParameters('nonExistentSymbol', parameterDeclarationsFile);
      }).toThrow('Unable to resolve symbol `nonExistentSymbol`');
    });
  });

  describe('dependency injection', () => {
    it('should use custom getDeclarationForName function', () => {
      const mockGetDeclarationForName = jest
        .fn()
        .mockReturnValue(
          parameterDeclarationsFile.getFunction('regularFunction')
        );

      const customGetParameters = getParametersForName(
        mockGetDeclarationForName
      );
      const parameters = customGetParameters(
        'testName',
        parameterDeclarationsFile
      );

      expect(mockGetDeclarationForName).toHaveBeenCalledWith(
        'testName',
        parameterDeclarationsFile
      );
      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('param1');
    });

    it('should handle when custom getDeclarationForName returns null', () => {
      const mockGetDeclarationForName = jest.fn().mockReturnValue(null);

      const customGetParameters = getParametersForName(
        mockGetDeclarationForName
      );

      expect(() => {
        customGetParameters('testName', parameterDeclarationsFile);
      }).toThrow('Unable to resolve symbol `testName`');

      expect(mockGetDeclarationForName).toHaveBeenCalledWith(
        'testName',
        parameterDeclarationsFile
      );
    });

    it('should handle when custom getDeclarationForName returns undefined', () => {
      const mockGetDeclarationForName = jest.fn().mockReturnValue(undefined);

      const customGetParameters = getParametersForName(
        mockGetDeclarationForName
      );

      expect(() => {
        customGetParameters('testName', parameterDeclarationsFile);
      }).toThrow('Unable to resolve symbol `testName`');

      expect(mockGetDeclarationForName).toHaveBeenCalledWith(
        'testName',
        parameterDeclarationsFile
      );
    });

    it('should work with mock that returns import declaration', () => {
      const importDeclaration =
        withParameterImportsFile.getImportDeclarations()[0];
      const targetFunction =
        importedFunctionsFile.getFunction('importedFunction');

      // Mock to return import declaration on first call, then the actual function
      const mockGetDeclarationForName = jest
        .fn()
        .mockReturnValueOnce(importDeclaration)
        .mockReturnValueOnce(targetFunction);

      const customGetParameters = getParametersForName(
        mockGetDeclarationForName
      );
      const parameters = customGetParameters(
        'importedFunction',
        withParameterImportsFile
      );

      expect(mockGetDeclarationForName).toHaveBeenCalledTimes(2); // Once for initial call, once for recursive call
      expect(parameters).toHaveLength(2);
      expect(parameters[0].getName()).toBe('importedParam1');
      expect(parameters[1].getName()).toBe('importedParam2');
    });
  });
});
