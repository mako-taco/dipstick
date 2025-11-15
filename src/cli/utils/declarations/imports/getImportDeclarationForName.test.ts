import { Project, SourceFile } from 'ts-morph';
import path from 'path';
import { getImportDeclarationForName } from './getImportDeclarationForName';

describe('getImportDeclarationForName', () => {
  let project: Project;
  let namedImportsFile: SourceFile;
  let defaultImportsFile: SourceFile;
  let aliasedImportsFile: SourceFile;
  let mixedImportsFile: SourceFile;
  let externalModuleImportsFile: SourceFile;
  let noImportsFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    // Load source files that are being imported
    project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/source-files/logger.ts')
    );
    project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/source-files/types.ts')
    );
    project.addSourceFileAtPath(
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
    noImportsFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/no-imports.ts')
    );
  });

  describe('finding named imports', () => {
    it('should find a named import from logger source file', () => {
      const result = getImportDeclarationForName('Logger', namedImportsFile);

      expect(result).toBeDefined();
      expect(result?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
    });

    it('should find a named import from types source file', () => {
      const result = getImportDeclarationForName('User', namedImportsFile);

      expect(result).toBeDefined();
      expect(result?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
    });

    it('should find multiple named imports from same declaration', () => {
      const loggerResult = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );
      const defaultLoggerResult = getImportDeclarationForName(
        'DefaultLogger',
        namedImportsFile
      );
      const createLoggerResult = getImportDeclarationForName(
        'createLogger',
        namedImportsFile
      );

      expect(loggerResult).toBeDefined();
      expect(defaultLoggerResult).toBeDefined();
      expect(createLoggerResult).toBeDefined();

      // All should be from the same import declaration
      expect(loggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
      expect(defaultLoggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
      expect(createLoggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
    });

    it('should find multiple named imports from different declarations', () => {
      const userResult = getImportDeclarationForName('User', namedImportsFile);
      const configResult = getImportDeclarationForName(
        'Config',
        namedImportsFile
      );
      const statusResult = getImportDeclarationForName(
        'Status',
        namedImportsFile
      );

      expect(userResult).toBeDefined();
      expect(configResult).toBeDefined();
      expect(statusResult).toBeDefined();

      // All should be from the types import declaration
      expect(userResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
      expect(configResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
      expect(statusResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
    });

    it('should return undefined for non-existent named import', () => {
      const result = getImportDeclarationForName(
        'NonExistentImport',
        namedImportsFile
      );

      expect(result).toBeUndefined();
    });
  });

  describe('finding default imports', () => {
    it('should find a default import from types', () => {
      const result = getImportDeclarationForName(
        'DefaultInterface',
        defaultImportsFile
      );

      expect(result).toBeDefined();
      expect(result?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
      expect(result?.getDefaultImport()?.getText()).toBe('DefaultInterface');
    });

    it('should find a default import from utils', () => {
      const result = getImportDeclarationForName(
        'defaultUtilFunction',
        defaultImportsFile
      );

      expect(result).toBeDefined();
      expect(result?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/utils'
      );
      expect(result?.getDefaultImport()?.getText()).toBe('defaultUtilFunction');
    });

    it('should return undefined for non-existent default import', () => {
      const result = getImportDeclarationForName(
        'NonExistentDefault',
        defaultImportsFile
      );

      expect(result).toBeUndefined();
    });
  });

  describe('finding aliased imports', () => {
    it('should find an aliased import by its alias name', () => {
      const result = getImportDeclarationForName(
        'AppLogger',
        aliasedImportsFile
      );

      expect(result).toBeDefined();
      expect(result?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
    });

    it('should find an aliased import by checking all aliases', () => {
      const appLoggerResult = getImportDeclarationForName(
        'AppLogger',
        aliasedImportsFile
      );
      const customLoggerResult = getImportDeclarationForName(
        'CustomLogger',
        aliasedImportsFile
      );
      const appUserResult = getImportDeclarationForName(
        'AppUser',
        aliasedImportsFile
      );
      const formatterResult = getImportDeclarationForName(
        'formatter',
        aliasedImportsFile
      );

      expect(appLoggerResult).toBeDefined();
      expect(customLoggerResult).toBeDefined();
      expect(appUserResult).toBeDefined();
      expect(formatterResult).toBeDefined();

      expect(appLoggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
      expect(customLoggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
      expect(appUserResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
      expect(formatterResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/utils'
      );
    });

    it('should not find an aliased import by its original name', () => {
      const result = getImportDeclarationForName('Logger', aliasedImportsFile);

      expect(result).toBeUndefined();
    });

    it('should not find an aliased import by its original name for formatString', () => {
      const result = getImportDeclarationForName(
        'formatString',
        aliasedImportsFile
      );

      expect(result).toBeUndefined();
    });

    it('should find default import with alias in mixed default+named scenario', () => {
      const defaultUtilResult = getImportDeclarationForName(
        'defaultUtil',
        aliasedImportsFile
      );

      expect(defaultUtilResult).toBeDefined();
      expect(defaultUtilResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/utils'
      );
    });
  });

  describe('finding mixed imports', () => {
    it('should find default import in mixed import declaration', () => {
      const defaultUtilResult = getImportDeclarationForName(
        'defaultUtil',
        mixedImportsFile
      );

      expect(defaultUtilResult).toBeDefined();
      expect(defaultUtilResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/utils'
      );
      expect(defaultUtilResult?.getDefaultImport()?.getText()).toBe(
        'defaultUtil'
      );
    });

    it('should find named import in mixed import declaration', () => {
      const formatStringResult = getImportDeclarationForName(
        'formatString',
        mixedImportsFile
      );
      const delayResult = getImportDeclarationForName(
        'delay',
        mixedImportsFile
      );

      expect(formatStringResult).toBeDefined();
      expect(delayResult).toBeDefined();

      expect(formatStringResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/utils'
      );
      expect(delayResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/utils'
      );
    });

    it('should handle multiple mixed import declarations', () => {
      const defaultInterfaceResult = getImportDeclarationForName(
        'DefaultInterface',
        mixedImportsFile
      );
      const userResult = getImportDeclarationForName('User', mixedImportsFile);
      const statusResult = getImportDeclarationForName(
        'Status',
        mixedImportsFile
      );

      expect(defaultInterfaceResult).toBeDefined();
      expect(userResult).toBeDefined();
      expect(statusResult).toBeDefined();

      expect(
        defaultInterfaceResult?.getModuleSpecifier().getLiteralValue()
      ).toBe('./source-files/types');
      expect(userResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
      expect(statusResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/types'
      );
    });
  });

  describe('finding external module imports', () => {
    it('should find default import from external module', () => {
      const reactResult = getImportDeclarationForName(
        'React',
        externalModuleImportsFile
      );

      expect(reactResult).toBeDefined();
      expect(reactResult?.getModuleSpecifier().getLiteralValue()).toBe('react');
      expect(reactResult?.getDefaultImport()?.getText()).toBe('React');
    });

    it('should find named imports from external modules', () => {
      const componentResult = getImportDeclarationForName(
        'Component',
        externalModuleImportsFile
      );
      const useStateResult = getImportDeclarationForName(
        'useState',
        externalModuleImportsFile
      );
      const useEffectResult = getImportDeclarationForName(
        'useEffect',
        externalModuleImportsFile
      );

      expect(componentResult).toBeDefined();
      expect(useStateResult).toBeDefined();
      expect(useEffectResult).toBeDefined();

      expect(componentResult?.getModuleSpecifier().getLiteralValue()).toBe(
        'react'
      );
      expect(useStateResult?.getModuleSpecifier().getLiteralValue()).toBe(
        'react'
      );
      expect(useEffectResult?.getModuleSpecifier().getLiteralValue()).toBe(
        'react'
      );
    });

    it('should find imports from different external modules', () => {
      const fsResult = getImportDeclarationForName(
        'fs',
        externalModuleImportsFile
      );
      const joinResult = getImportDeclarationForName(
        'join',
        externalModuleImportsFile
      );
      const resolveResult = getImportDeclarationForName(
        'resolve',
        externalModuleImportsFile
      );
      const eventEmitterResult = getImportDeclarationForName(
        'EventEmitter',
        externalModuleImportsFile
      );

      expect(fsResult).toBeDefined();
      expect(joinResult).toBeDefined();
      expect(resolveResult).toBeDefined();
      expect(eventEmitterResult).toBeDefined();

      expect(fsResult?.getModuleSpecifier().getLiteralValue()).toBe('fs');
      expect(joinResult?.getModuleSpecifier().getLiteralValue()).toBe('path');
      expect(resolveResult?.getModuleSpecifier().getLiteralValue()).toBe(
        'path'
      );
      expect(eventEmitterResult?.getModuleSpecifier().getLiteralValue()).toBe(
        'events'
      );
    });
  });

  describe('files with no imports', () => {
    it('should return undefined when no imports exist', () => {
      const result = getImportDeclarationForName('SomeImport', noImportsFile);

      expect(result).toBeUndefined();
    });

    it('should return undefined for any name when file has no imports', () => {
      const results = [
        getImportDeclarationForName('React', noImportsFile),
        getImportDeclarationForName('fs', noImportsFile),
        getImportDeclarationForName('Logger', noImportsFile),
        getImportDeclarationForName('User', noImportsFile),
      ];

      results.forEach(result => {
        expect(result).toBeUndefined();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string name', () => {
      const result = getImportDeclarationForName('', namedImportsFile);

      expect(result).toBeUndefined();
    });

    it('should handle whitespace-only name', () => {
      const result = getImportDeclarationForName('   ', namedImportsFile);

      expect(result).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const lowerResult = getImportDeclarationForName(
        'logger',
        namedImportsFile
      );
      const upperResult = getImportDeclarationForName(
        'LOGGER',
        namedImportsFile
      );
      const correctResult = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );

      expect(lowerResult).toBeUndefined();
      expect(upperResult).toBeUndefined();
      expect(correctResult).toBeDefined();
    });

    it('should distinguish between similar names', () => {
      const loggerResult = getImportDeclarationForName(
        'Logger',
        namedImportsFile
      );
      const defaultLoggerResult = getImportDeclarationForName(
        'DefaultLogger',
        namedImportsFile
      );
      const createLoggerResult = getImportDeclarationForName(
        'createLogger',
        namedImportsFile
      );

      expect(loggerResult).toBeDefined();
      expect(defaultLoggerResult).toBeDefined();
      expect(createLoggerResult).toBeDefined();

      // They should all be from the same import declaration since they're from the same import statement
      expect(loggerResult).toBe(defaultLoggerResult);
      expect(defaultLoggerResult).toBe(createLoggerResult);
      expect(loggerResult).toBe(createLoggerResult);

      // But the function should still find each name correctly
      expect(loggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
      expect(defaultLoggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
      expect(createLoggerResult?.getModuleSpecifier().getLiteralValue()).toBe(
        './source-files/logger'
      );
    });
  });
});
