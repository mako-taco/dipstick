import { Project, SourceFile } from 'ts-morph';
import path from 'path';
import { getFqnForImportDeclaration } from './getFqnForImportDeclaration';
import { getImportDeclarationForName } from './getImportDeclarationForName';

describe('getFqnForImportDeclaration', () => {
  let project: Project;
  let namedImportsFile: SourceFile;
  let defaultImportsFile: SourceFile;
  let aliasedImportsFile: SourceFile;
  let mixedImportsFile: SourceFile;
  let externalModuleImportsFile: SourceFile;
  let mixedExternalLocalFile: SourceFile;
  let loggerSourceFile: SourceFile;
  let typesSourceFile: SourceFile;
  let utilsSourceFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    // Load source files that are being imported
    loggerSourceFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/source-files/logger.ts')
    );
    typesSourceFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/source-files/types.ts')
    );
    utilsSourceFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/source-files/utils.ts')
    );

    // Load fixture files that contain imports
    namedImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/named-imports.ts')
    );
    defaultImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/default-imports.ts')
    );
    aliasedImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/aliased-imports.ts')
    );
    mixedImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/mixed-imports.ts')
    );
    externalModuleImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/external-module-imports.ts')
    );
    mixedExternalLocalFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/mixed-external-local.ts')
    );
  });

  describe('with named imports', () => {
    it('should create FQN for named import pointing to imported file', () => {
      const importDeclaration = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('Logger', importDeclaration!);
      const expectedPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".Logger`);
    });

    it('should create FQN for multiple named imports from same source file', () => {
      const loggerImport = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );
      const defaultLoggerImport = getImportDeclarationForName(
        'DefaultLogger',
        namedImportsFile
      );
      const createLoggerImport = getImportDeclarationForName(
        'createLogger',
        namedImportsFile
      );

      expect(loggerImport).toBeDefined();
      expect(defaultLoggerImport).toBeDefined();
      expect(createLoggerImport).toBeDefined();

      const loggerFqn = getFqnForImportDeclaration('Logger', loggerImport!);
      const defaultLoggerFqn = getFqnForImportDeclaration(
        'DefaultLogger',
        defaultLoggerImport!
      );
      const createLoggerFqn = getFqnForImportDeclaration(
        'createLogger',
        createLoggerImport!
      );

      const expectedPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(loggerFqn).toBe(`"${expectedPath}".Logger`);
      expect(defaultLoggerFqn).toBe(`"${expectedPath}".DefaultLogger`);
      expect(createLoggerFqn).toBe(`"${expectedPath}".createLogger`);
    });

    it('should create FQN for named imports from different source files', () => {
      const loggerImport = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );
      const userImport = getImportDeclarationForName('User', namedImportsFile);

      expect(loggerImport).toBeDefined();
      expect(userImport).toBeDefined();

      const loggerFqn = getFqnForImportDeclaration('Logger', loggerImport!);
      const userFqn = getFqnForImportDeclaration('User', userImport!);

      const expectedLoggerPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      const expectedTypesPath = typesSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(loggerFqn).toBe(`"${expectedLoggerPath}".Logger`);
      expect(userFqn).toBe(`"${expectedTypesPath}".User`);
    });
  });

  describe('with default imports', () => {
    it('should create FQN for default import pointing to imported file', () => {
      const importDeclaration = getImportDeclarationForName(
        'DefaultInterface',
        defaultImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration(
        'DefaultInterface',
        importDeclaration!
      );
      const expectedPath = typesSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".DefaultInterface`);
    });

    it('should create FQN for multiple default imports from different files', () => {
      const defaultInterfaceImport = getImportDeclarationForName(
        'DefaultInterface',
        defaultImportsFile
      );
      const defaultUtilImport = getImportDeclarationForName(
        'defaultUtilFunction',
        defaultImportsFile
      );

      expect(defaultInterfaceImport).toBeDefined();
      expect(defaultUtilImport).toBeDefined();

      const defaultInterfaceFqn = getFqnForImportDeclaration(
        'DefaultInterface',
        defaultInterfaceImport!
      );
      const defaultUtilFqn = getFqnForImportDeclaration(
        'defaultUtilFunction',
        defaultUtilImport!
      );

      const expectedTypesPath = typesSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      const expectedUtilsPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(defaultInterfaceFqn).toBe(
        `"${expectedTypesPath}".DefaultInterface`
      );
      expect(defaultUtilFqn).toBe(`"${expectedUtilsPath}".defaultUtilFunction`);
    });
  });

  describe('with aliased imports', () => {
    it('should create FQN for aliased import using alias name', () => {
      const importDeclaration = getImportDeclarationForName(
        'AppLogger',
        aliasedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('AppLogger', importDeclaration!);
      const expectedPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".AppLogger`);
    });

    it('should create FQN for multiple aliased imports', () => {
      const appLoggerImport = getImportDeclarationForName(
        'AppLogger',
        aliasedImportsFile
      );
      const customLoggerImport = getImportDeclarationForName(
        'CustomLogger',
        aliasedImportsFile
      );
      const appUserImport = getImportDeclarationForName(
        'AppUser',
        aliasedImportsFile
      );
      const formatterImport = getImportDeclarationForName(
        'formatter',
        aliasedImportsFile
      );

      expect(appLoggerImport).toBeDefined();
      expect(customLoggerImport).toBeDefined();
      expect(appUserImport).toBeDefined();
      expect(formatterImport).toBeDefined();

      const appLoggerFqn = getFqnForImportDeclaration(
        'AppLogger',
        appLoggerImport!
      );
      const customLoggerFqn = getFqnForImportDeclaration(
        'CustomLogger',
        customLoggerImport!
      );
      const appUserFqn = getFqnForImportDeclaration('AppUser', appUserImport!);
      const formatterFqn = getFqnForImportDeclaration(
        'formatter',
        formatterImport!
      );

      const expectedLoggerPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      const expectedTypesPath = typesSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      const expectedUtilsPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(appLoggerFqn).toBe(`"${expectedLoggerPath}".AppLogger`);
      expect(customLoggerFqn).toBe(`"${expectedLoggerPath}".CustomLogger`);
      expect(appUserFqn).toBe(`"${expectedTypesPath}".AppUser`);
      expect(formatterFqn).toBe(`"${expectedUtilsPath}".formatter`);
    });

    it('should create FQN for mixed default and aliased imports', () => {
      const defaultUtilImport = getImportDeclarationForName(
        'defaultUtil',
        aliasedImportsFile
      );
      const formatterImport = getImportDeclarationForName(
        'formatter',
        aliasedImportsFile
      );

      expect(defaultUtilImport).toBeDefined();
      expect(formatterImport).toBeDefined();

      const defaultUtilFqn = getFqnForImportDeclaration(
        'defaultUtil',
        defaultUtilImport!
      );
      const formatterFqn = getFqnForImportDeclaration(
        'formatter',
        formatterImport!
      );

      const expectedUtilsPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(defaultUtilFqn).toBe(`"${expectedUtilsPath}".defaultUtil`);
      expect(formatterFqn).toBe(`"${expectedUtilsPath}".formatter`);
    });
  });

  describe('with mixed import scenarios', () => {
    it('should create FQN for default import in mixed declaration', () => {
      const defaultUtilImport = getImportDeclarationForName(
        'defaultUtil',
        mixedImportsFile
      );

      expect(defaultUtilImport).toBeDefined();

      const fqn = getFqnForImportDeclaration('defaultUtil', defaultUtilImport!);
      const expectedPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".defaultUtil`);
    });

    it('should create FQN for named imports in mixed declaration', () => {
      const formatStringImport = getImportDeclarationForName(
        'formatString',
        mixedImportsFile
      );
      const delayImport = getImportDeclarationForName(
        'delay',
        mixedImportsFile
      );

      expect(formatStringImport).toBeDefined();
      expect(delayImport).toBeDefined();

      const formatStringFqn = getFqnForImportDeclaration(
        'formatString',
        formatStringImport!
      );
      const delayFqn = getFqnForImportDeclaration('delay', delayImport!);

      const expectedPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(formatStringFqn).toBe(`"${expectedPath}".formatString`);
      expect(delayFqn).toBe(`"${expectedPath}".delay`);
    });

    it('should handle mixed default and named imports from different files', () => {
      const defaultInterfaceImport = getImportDeclarationForName(
        'DefaultInterface',
        mixedImportsFile
      );
      const userImport = getImportDeclarationForName('User', mixedImportsFile);
      const defaultUtilImport = getImportDeclarationForName(
        'defaultUtil',
        mixedImportsFile
      );

      expect(defaultInterfaceImport).toBeDefined();
      expect(userImport).toBeDefined();
      expect(defaultUtilImport).toBeDefined();

      const defaultInterfaceFqn = getFqnForImportDeclaration(
        'DefaultInterface',
        defaultInterfaceImport!
      );
      const userFqn = getFqnForImportDeclaration('User', userImport!);
      const defaultUtilFqn = getFqnForImportDeclaration(
        'defaultUtil',
        defaultUtilImport!
      );

      const expectedTypesPath = typesSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      const expectedUtilsPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(defaultInterfaceFqn).toBe(
        `"${expectedTypesPath}".DefaultInterface`
      );
      expect(userFqn).toBe(`"${expectedTypesPath}".User`);
      expect(defaultUtilFqn).toBe(`"${expectedUtilsPath}".defaultUtil`);
    });
  });

  describe('path extension handling', () => {
    it('should remove .ts extension from imported file path', () => {
      const importDeclaration = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('Logger', importDeclaration!);

      // Ensure the path doesn't contain .ts extension
      expect(fqn).not.toContain('.ts"');
      // Ensure it follows the correct format: "path".name
      expect(fqn).toMatch(/^".*"\.Logger$/);
      // Specifically check that the file path portion ends without .ts
      const pathPortion = fqn.split('"')[1];
      expect(pathPortion.endsWith('.ts')).toBe(false);
    });

    it('should create consistent FQN format', () => {
      const importDeclaration = getImportDeclarationForName(
        'User',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('User', importDeclaration!);

      // Should match the format: "path".name
      expect(fqn).toMatch(/^".*"\.User$/);
      expect(fqn.startsWith('"')).toBe(true);
      expect(fqn.endsWith('.User')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle different name than import', () => {
      const importDeclaration = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      // Use a different name than what was used to find the import
      const fqn = getFqnForImportDeclaration('CustomName', importDeclaration!);
      const expectedPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".CustomName`);
    });

    it('should handle empty string name', () => {
      const importDeclaration = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('', importDeclaration!);
      const expectedPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".`);
    });

    it('should handle special characters in name', () => {
      const importDeclaration = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration(
        'Special$Name_123',
        importDeclaration!
      );
      const expectedPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(fqn).toBe(`"${expectedPath}".Special$Name_123`);
    });
  });

  describe('function behavior verification', () => {
    it('should use the imported file path, not the importing file path', () => {
      const importDeclaration = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('Logger', importDeclaration!);

      // Should contain the imported file path (logger.ts)
      const importedFilePath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(fqn).toContain(importedFilePath);

      // Should NOT contain the importing file path (named-imports.ts)
      const importingFilePath = namedImportsFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      expect(fqn).not.toContain(importingFilePath);
    });

    it('should work consistently across different import types', () => {
      const namedImport = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );
      const defaultImport = getImportDeclarationForName(
        'defaultUtil',
        aliasedImportsFile
      );
      const aliasedImport = getImportDeclarationForName(
        'AppLogger',
        aliasedImportsFile
      );

      expect(namedImport).toBeDefined();
      expect(defaultImport).toBeDefined();
      expect(aliasedImport).toBeDefined();

      const namedFqn = getFqnForImportDeclaration('TestName', namedImport!);
      const defaultFqn = getFqnForImportDeclaration('TestName', defaultImport!);
      const aliasedFqn = getFqnForImportDeclaration('TestName', aliasedImport!);

      // All should use the format "path".name
      expect(namedFqn).toMatch(/^".*"\.TestName$/);
      expect(defaultFqn).toMatch(/^".*"\.TestName$/);
      expect(aliasedFqn).toMatch(/^".*"\.TestName$/);

      // But should have different paths based on the imported files
      expect(namedFqn.includes('logger')).toBe(true);
      expect(defaultFqn.includes('utils')).toBe(true);
      expect(aliasedFqn.includes('logger')).toBe(true);
    });
  });

  describe('with external module imports', () => {
    it('should create FQN using module specifier for external default import', () => {
      const importDeclaration = getImportDeclarationForName(
        'React',
        externalModuleImportsFile
      );

      expect(importDeclaration).toBeDefined();

      const fqn = getFqnForImportDeclaration('React', importDeclaration!);

      expect(fqn).toBe('"react".React');
    });

    it('should create FQN using module specifier for external named imports', () => {
      const componentImport = getImportDeclarationForName(
        'Component',
        externalModuleImportsFile
      );
      const useStateImport = getImportDeclarationForName(
        'useState',
        externalModuleImportsFile
      );
      const useEffectImport = getImportDeclarationForName(
        'useEffect',
        externalModuleImportsFile
      );

      expect(componentImport).toBeDefined();
      expect(useStateImport).toBeDefined();
      expect(useEffectImport).toBeDefined();

      const componentFqn = getFqnForImportDeclaration(
        'Component',
        componentImport!
      );
      const useStateFqn = getFqnForImportDeclaration(
        'useState',
        useStateImport!
      );
      const useEffectFqn = getFqnForImportDeclaration(
        'useEffect',
        useEffectImport!
      );

      expect(componentFqn).toBe('"react".Component');
      expect(useStateFqn).toBe('"react".useState');
      expect(useEffectFqn).toBe('"react".useEffect');
    });

    it('should create FQN using module specifier for different external modules', () => {
      const fsImport = getImportDeclarationForName(
        'fs',
        externalModuleImportsFile
      );
      const joinImport = getImportDeclarationForName(
        'join',
        externalModuleImportsFile
      );
      const resolveImport = getImportDeclarationForName(
        'resolve',
        externalModuleImportsFile
      );
      const eventEmitterImport = getImportDeclarationForName(
        'EventEmitter',
        externalModuleImportsFile
      );

      expect(fsImport).toBeDefined();
      expect(joinImport).toBeDefined();
      expect(resolveImport).toBeDefined();
      expect(eventEmitterImport).toBeDefined();

      const fsFqn = getFqnForImportDeclaration('fs', fsImport!);
      const joinFqn = getFqnForImportDeclaration('join', joinImport!);
      const resolveFqn = getFqnForImportDeclaration('resolve', resolveImport!);
      const eventEmitterFqn = getFqnForImportDeclaration(
        'EventEmitter',
        eventEmitterImport!
      );

      expect(fsFqn).toBe('"fs".fs');
      expect(joinFqn).toBe('"path".join');
      expect(resolveFqn).toBe('"path".resolve');
      expect(eventEmitterFqn).toBe('"events".EventEmitter');
    });
  });

  describe('with mixed external and local imports', () => {
    it('should use module specifier for external imports and file path for local imports', () => {
      const reactImport = getImportDeclarationForName(
        'React',
        mixedExternalLocalFile
      );
      const readFileSyncImport = getImportDeclarationForName(
        'readFileSync',
        mixedExternalLocalFile
      );
      const loggerImport = getImportDeclarationForName(
        'Logger',
        mixedExternalLocalFile
      );
      const defaultUtilImport = getImportDeclarationForName(
        'defaultUtil',
        mixedExternalLocalFile
      );

      expect(reactImport).toBeDefined();
      expect(readFileSyncImport).toBeDefined();
      expect(loggerImport).toBeDefined();
      expect(defaultUtilImport).toBeDefined();

      const reactFqn = getFqnForImportDeclaration('React', reactImport!);
      const readFileSyncFqn = getFqnForImportDeclaration(
        'readFileSync',
        readFileSyncImport!
      );
      const loggerFqn = getFqnForImportDeclaration('Logger', loggerImport!);
      const defaultUtilFqn = getFqnForImportDeclaration(
        'defaultUtil',
        defaultUtilImport!
      );

      // External modules should use module specifier
      expect(reactFqn).toBe('"react".React');
      expect(readFileSyncFqn).toBe('"fs".readFileSync');

      // Local imports should use file paths
      const expectedLoggerPath = loggerSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');
      const expectedUtilsPath = utilsSourceFile
        .getFilePath()
        .replace(/(?:\.d)?\.tsx?$/, '');

      expect(loggerFqn).toBe(`"${expectedLoggerPath}".Logger`);
      expect(defaultUtilFqn).toBe(`"${expectedUtilsPath}".defaultUtil`);
    });

    it('should handle mixed scenarios consistently', () => {
      const externalImport = getImportDeclarationForName(
        'React',
        mixedExternalLocalFile
      );
      const localImport = getImportDeclarationForName(
        'Logger',
        mixedExternalLocalFile
      );

      expect(externalImport).toBeDefined();
      expect(localImport).toBeDefined();

      const externalFqn = getFqnForImportDeclaration(
        'TestName',
        externalImport!
      );
      const localFqn = getFqnForImportDeclaration('TestName', localImport!);

      // External should use module name
      expect(externalFqn).toBe('"react".TestName');

      // Local should use file path
      expect(localFqn).toMatch(/^".*source-files.*logger.*"\.TestName$/);
    });
  });

  describe('function behavior verification with external modules', () => {
    it('should distinguish between external modules and local files', () => {
      const externalImport = getImportDeclarationForName(
        'React',
        externalModuleImportsFile
      );
      const localImport = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(externalImport).toBeDefined();
      expect(localImport).toBeDefined();

      const externalFqn = getFqnForImportDeclaration(
        'TestName',
        externalImport!
      );
      const localFqn = getFqnForImportDeclaration('TestName', localImport!);

      // External module should not contain file paths
      expect(externalFqn).toBe('"react".TestName');
      expect(externalFqn).not.toContain('/');
      expect(externalFqn).not.toContain(__dirname);

      // Local import should contain file path
      expect(localFqn).toContain(__dirname);
      expect(localFqn).toContain('/');
    });

    it('should not apply file extension removal to external module names', () => {
      const reactImport = getImportDeclarationForName(
        'React',
        externalModuleImportsFile
      );
      const fsImport = getImportDeclarationForName(
        'fs',
        externalModuleImportsFile
      );

      expect(reactImport).toBeDefined();
      expect(fsImport).toBeDefined();

      const reactFqn = getFqnForImportDeclaration('React', reactImport!);
      const fsFqn = getFqnForImportDeclaration('fs', fsImport!);

      // Should preserve module names exactly
      expect(reactFqn).toBe('"react".React');
      expect(fsFqn).toBe('"fs".fs');

      // Should not have any extension-related artifacts
      expect(reactFqn).not.toContain('.ts');
      expect(fsFqn).not.toContain('.ts');
    });

    it('should work with scoped packages if present', () => {
      // This test would work if we had scoped package imports
      // For now, we just verify the current external modules work correctly
      const eventEmitterImport = getImportDeclarationForName(
        'EventEmitter',
        externalModuleImportsFile
      );

      expect(eventEmitterImport).toBeDefined();

      const fqn = getFqnForImportDeclaration(
        'EventEmitter',
        eventEmitterImport!
      );

      expect(fqn).toBe('"events".EventEmitter');
    });
  });
});
