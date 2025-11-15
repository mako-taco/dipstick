import { Project, SourceFile } from 'ts-morph';
import path from 'path';
import { getFqnForAlias } from './getFqnForAlias';
import { CodegenError } from '../error';

describe('getFqnForAlias', () => {
  let project: Project;
  let sourceModuleFile: SourceFile;
  let withImportsFile: SourceFile;
  let withNonExportedFile: SourceFile;
  let mixedDeclarationsFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    // Load supporting files first
    project.addSourceFileAtPath(
      path.join(
        __dirname,
        'declarations/imports/__fixtures__/source-files/logger.ts'
      )
    );
    project.addSourceFileAtPath(
      path.join(
        __dirname,
        'declarations/imports/__fixtures__/source-files/utils.ts'
      )
    );
    project.addSourceFileAtPath(
      path.join(
        __dirname,
        'declarations/imports/__fixtures__/source-files/types.ts'
      )
    );

    // Load fixture files
    sourceModuleFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/source-module.ts')
    );
    withImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/with-imports.ts')
    );
    withNonExportedFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/with-non-exported.ts')
    );
    mixedDeclarationsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/mixed-declarations.ts')
    );
  });

  describe('with imported symbols', () => {
    it('should return FQN for imported class symbol', () => {
      const sourceClassDeclaration =
        withImportsFile.getImportDeclaration('./source-module')!;
      const importClause = sourceClassDeclaration.getImportClause()!;
      const namedImports = importClause.getNamedImports()!;
      const sourceClassImport = namedImports.find(
        el => el.getName() === 'SourceClass'
      )!;
      const symbol = sourceClassImport.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      // Should resolve to the imported file path
      const expectedSourcePath = sourceModuleFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedSourcePath}".SourceClass`);
    });

    it('should return FQN for imported interface symbol', () => {
      const sourceInterfaceDeclaration =
        withImportsFile.getImportDeclaration('./source-module')!;
      const importClause = sourceInterfaceDeclaration.getImportClause()!;
      const namedImports = importClause.getNamedImports()!;
      const sourceInterfaceImport = namedImports.find(
        el => el.getName() === 'SourceInterface'
      )!;
      const symbol = sourceInterfaceImport.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedSourcePath = sourceModuleFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedSourcePath}".SourceInterface`);
    });

    it('should return FQN for default import symbol', () => {
      const defaultImportDeclaration = withImportsFile.getImportDeclaration(
        '../declarations/imports/__fixtures__/source-files/utils'
      )!;
      const defaultImport = defaultImportDeclaration.getDefaultImport()!;
      const symbol = defaultImport.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      // Should resolve to the utils file
      expect(result).toContain('utils');
      expect(result).toContain('defaultUtil');
    });
  });

  describe('with local exported symbols', () => {
    it('should return FQN for local exported class symbol', () => {
      const localClass = withImportsFile.getClass('LocalClass')!;
      const symbol = localClass.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".LocalClass`);
    });

    it('should return FQN for local exported variable symbol', () => {
      const localConstant =
        withImportsFile.getVariableDeclaration('LOCAL_CONSTANT')!;
      const symbol = localConstant.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".LOCAL_CONSTANT`);
    });

    it('should return FQN for local exported function symbol', () => {
      const localFunction = withImportsFile.getFunction('localFunction')!;
      const symbol = localFunction.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".localFunction`);
    });

    it('should return FQN for local exported interface symbol', () => {
      const localInterface = withImportsFile.getInterface('LocalInterface')!;
      const symbol = localInterface.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".LocalInterface`);
    });

    it('should return FQN for local exported type alias symbol', () => {
      const localType = withImportsFile.getTypeAlias('LocalType')!;
      const symbol = localType.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".LocalType`);
    });

    it('should return FQN for local exported arrow function variable symbol', () => {
      const arrowFunction =
        withImportsFile.getVariableDeclaration('localArrowFunction')!;
      const symbol = arrowFunction.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".localArrowFunction`);
    });
  });

  describe('error cases', () => {
    it('should throw CodegenError when symbol exists but is not exported', () => {
      const nonExportedClass =
        withNonExportedFile.getClass('NonExportedClass')!;
      const symbol = nonExportedClass.getSymbol()!;

      expect(() => getFqnForAlias(symbol, withNonExportedFile)).toThrow(
        CodegenError
      );
      expect(() => getFqnForAlias(symbol, withNonExportedFile)).toThrow(
        /Symbol `NonExportedClass`.*needs to be exported to be used in a binding/
      );
    });

    it('should throw CodegenError when non-exported variable symbol is used', () => {
      const nonExportedVariable = withNonExportedFile.getVariableDeclaration(
        'nonExportedConstant'
      )!;
      const symbol = nonExportedVariable.getSymbol()!;

      expect(() => getFqnForAlias(symbol, withNonExportedFile)).toThrow(
        CodegenError
      );
      expect(() => getFqnForAlias(symbol, withNonExportedFile)).toThrow(
        /Symbol `nonExportedConstant`.*needs to be exported to be used in a binding/
      );
    });

    it('should throw CodegenError when non-exported function symbol is used', () => {
      const nonExportedFunction = withNonExportedFile.getFunction(
        'nonExportedFunction'
      )!;
      const symbol = nonExportedFunction.getSymbol()!;

      expect(() => getFqnForAlias(symbol, withNonExportedFile)).toThrow(
        CodegenError
      );
      expect(() => getFqnForAlias(symbol, withNonExportedFile)).toThrow(
        /Symbol `nonExportedFunction`.*needs to be exported to be used in a binding/
      );
    });
  });

  describe('mixed scenarios', () => {
    it('should prioritize import declarations over local declarations', () => {
      // SourceClass is both imported and could theoretically be a local declaration name
      const sourceClassImport = mixedDeclarationsFile
        .getImportDeclaration('./source-module')!
        .getImportClause()!
        .getNamedImports()!
        .find(el => el.getName() === 'SourceClass')!;
      const symbol = sourceClassImport.getSymbol()!;

      const result = getFqnForAlias(symbol, mixedDeclarationsFile);

      // Should resolve to the imported module, not local file
      const expectedSourcePath = sourceModuleFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedSourcePath}".SourceClass`);
    });

    it('should handle exported symbols correctly in mixed files', () => {
      const exportedClass = mixedDeclarationsFile.getClass('ExportedClass')!;
      const symbol = exportedClass.getSymbol()!;

      const result = getFqnForAlias(symbol, mixedDeclarationsFile);

      const expectedPath = mixedDeclarationsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(result).toBe(`"${expectedPath}".ExportedClass`);
    });

    it('should throw for non-exported symbols in mixed files', () => {
      const nonExportedClass =
        mixedDeclarationsFile.getClass('NonExportedClass')!;
      const symbol = nonExportedClass.getSymbol()!;

      expect(() => getFqnForAlias(symbol, mixedDeclarationsFile)).toThrow(
        CodegenError
      );
      expect(() => getFqnForAlias(symbol, mixedDeclarationsFile)).toThrow(
        /Symbol `NonExportedClass`.*needs to be exported to be used in a binding/
      );
    });
  });

  describe('function behavior verification', () => {
    it('should use the correct source file for path generation', () => {
      const localClass = withImportsFile.getClass('LocalClass')!;
      const symbol = localClass.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      // Should contain the actual file path, not some other path
      expect(result).toContain('with-imports');
      expect(result).not.toContain('source-module');
      expect(result).not.toContain('mixed-declarations');
    });

    it('should handle different declaration types consistently', () => {
      const classSymbol = withImportsFile.getClass('LocalClass')!.getSymbol()!;
      const functionSymbol = withImportsFile
        .getFunction('localFunction')!
        .getSymbol()!;
      const variableSymbol = withImportsFile
        .getVariableDeclaration('LOCAL_CONSTANT')!
        .getSymbol()!;
      const interfaceSymbol = withImportsFile
        .getInterface('LocalInterface')!
        .getSymbol()!;
      const typeSymbol = withImportsFile
        .getTypeAlias('LocalType')!
        .getSymbol()!;

      const classResult = getFqnForAlias(classSymbol, withImportsFile);
      const functionResult = getFqnForAlias(functionSymbol, withImportsFile);
      const variableResult = getFqnForAlias(variableSymbol, withImportsFile);
      const interfaceResult = getFqnForAlias(interfaceSymbol, withImportsFile);
      const typeResult = getFqnForAlias(typeSymbol, withImportsFile);

      const expectedPath = withImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(classResult).toBe(`"${expectedPath}".LocalClass`);
      expect(functionResult).toBe(`"${expectedPath}".localFunction`);
      expect(variableResult).toBe(`"${expectedPath}".LOCAL_CONSTANT`);
      expect(interfaceResult).toBe(`"${expectedPath}".LocalInterface`);
      expect(typeResult).toBe(`"${expectedPath}".LocalType`);

      // All should follow the same format pattern
      const fqnPattern = /^".*"\.[\w$]+$/;
      expect(classResult).toMatch(fqnPattern);
      expect(functionResult).toMatch(fqnPattern);
      expect(variableResult).toMatch(fqnPattern);
      expect(interfaceResult).toMatch(fqnPattern);
      expect(typeResult).toMatch(fqnPattern);
    });

    it('should remove file extensions from local file paths', () => {
      const localClass = withImportsFile.getClass('LocalClass')!;
      const symbol = localClass.getSymbol()!;

      const result = getFqnForAlias(symbol, withImportsFile);

      // Should not contain .ts extension
      expect(result).not.toContain('.ts');
      expect(result).not.toContain('.tsx');

      // Should end with the correct format
      expect(result).toMatch(/^".*"\.LocalClass$/);
    });

    it('should handle import vs local declaration precedence correctly', () => {
      // Test that imports take precedence over potential local declarations
      const defaultUtilImport = withImportsFile
        .getImportDeclaration(
          '../declarations/imports/__fixtures__/source-files/utils'
        )!
        .getDefaultImport()!;
      const defaultUtilSymbol = defaultUtilImport.getSymbol()!;

      const result = getFqnForAlias(defaultUtilSymbol, withImportsFile);

      // Should resolve to the imported utils file, not the current file
      expect(result).toContain('utils');
      expect(result).not.toContain('with-imports');
    });
  });
});
