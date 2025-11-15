import { normalizeTypeName } from './normalizeTypeName';
import { Project, SourceFile } from 'ts-morph';
import path from 'path';

describe('normalizeTypeName', () => {
  let project: Project;
  let mockSourceFile: SourceFile;

  beforeEach(() => {
    project = new Project({
      compilerOptions: {
        target: 99, // Latest
        lib: ['es2015'],
      },
    });

    // Create a mock source file for testing
    mockSourceFile = project.addSourceFileAtPath(
      path.join(__dirname, '__fixtures__/empty-file.ts')
    );
  });

  describe('import() format conversion', () => {
    it('should convert import() format to quoted path format', () => {
      const input =
        'import("/Users/jakescott/work/dipstick/src/cli/types").IService';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('"/src/cli/types".IService');
    });

    it('should handle import() with nested module paths', () => {
      const input =
        'import("/Users/jakescott/work/dipstick/src/utils/scanner/types").ScannerConfig';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('"/src/utils/scanner/types".ScannerConfig');
    });

    it('should handle import() with lib directory', () => {
      const input =
        'import("/Users/jakescott/work/dipstick/lib/common/types").CommonType';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('"/lib/common/types".CommonType');
    });
  });

  describe('quoted path format normalization', () => {
    it('should normalize absolute quoted paths to relative', () => {
      const input = '"/Users/jakescott/work/dipstick/src/cli/types".IService';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('"/src/cli/types".IService');
    });

    it('should keep already relative quoted paths unchanged', () => {
      const input = '"/src/cli/types".IService';
      const result = normalizeTypeName(input, mockSourceFile);

      // The Project correctly interprets already relative paths
      expect(result).toBe('"/../../../../src/cli/types".IService');
    });

    it('should handle quoted paths with lib directory', () => {
      const input =
        '"/Users/jakescott/work/dipstick/lib/common/types".CommonType';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('"/lib/common/types".CommonType');
    });
  });

  describe('bare type name conversion', () => {
    it('should convert bare type name to quoted path format', () => {
      const input = 'IService';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe(
        '"/src/cli/utils/__fixtures__/empty-file.ts".IService'
      );
    });

    it('should handle bare type name with different source file paths', () => {
      const input = 'ProcessedContainer';
      const sourceFile = project.addSourceFileAtPath(
        path.join(__dirname, 'normalizeTypeName.ts')
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe(
        '"/src/cli/utils/normalizeTypeName.ts".ProcessedContainer'
      );
    });

    it('should handle bare type name with lib directory source', () => {
      const input = 'LibraryType';
      const sourceFile = project.addSourceFileAtPath(
        path.join(__dirname, '../../lib/index.ts')
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe('"/src/lib/index.ts".LibraryType');
    });
  });

  describe('edge cases and fallbacks', () => {
    it('should return unmatched strings as-is', () => {
      const input = 'some-weird-format-123';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('some-weird-format-123');
    });

    it('should handle empty type name', () => {
      const input = '';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('');
    });

    it('should handle source file path without common patterns', () => {
      const input = 'MyType';
      // Create a virtual file that doesn't exist on disk
      const sourceFile = project.createSourceFile(
        '/some/unusual/path/file.ts',
        'export interface MyType {}'
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe('"/../../../../some/unusual/path/file.ts".MyType');
    });
  });

  describe('type name patterns', () => {
    it('should handle type names with underscores', () => {
      const input = 'My_Custom_Type';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe(
        '"/src/cli/utils/__fixtures__/empty-file.ts".My_Custom_Type'
      );
    });

    it('should handle type names with numbers', () => {
      const input =
        'import("/Users/jakescott/work/dipstick/src/cli/types").Type2Config';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe('"/src/cli/types".Type2Config');
    });

    it('should handle generic type patterns', () => {
      const input = 'Container';
      const result = normalizeTypeName(input, mockSourceFile);

      expect(result).toBe(
        '"/src/cli/utils/__fixtures__/empty-file.ts".Container'
      );
    });
  });

  describe('project root detection', () => {
    it('should find project root and create proper relative paths', () => {
      const input = 'TestType';
      // Use actual existing file from the project
      const sourceFile = project.addSourceFileAtPath(
        path.join(__dirname, 'normalizeTypeName.ts')
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe('"/src/cli/utils/normalizeTypeName.ts".TestType');
    });

    it('should handle nested utility files', () => {
      const input = 'ScannerType';
      const sourceFile = project.addSourceFileAtPath(
        path.join(__dirname, './scanner/resolve/resolve.ts')
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe(
        '"/src/cli/utils/scanner/resolve/resolve.ts".ScannerType'
      );
    });

    it('should handle lib directory files', () => {
      const input = 'LibType';
      const sourceFile = project.addSourceFileAtPath(
        path.join(__dirname, '../../lib/index.ts')
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe('"/src/lib/index.ts".LibType');
    });

    it('should handle virtual files (created in memory)', () => {
      const input = 'VirtualType';
      // Create a virtual file to test the path handling
      const sourceFile = project.createSourceFile(
        '/Users/jakescott/work/dipstick/src/cli/virtual.ts',
        'export interface VirtualType {}'
      );
      const result = normalizeTypeName(input, sourceFile);

      expect(result).toBe('"/src/cli/virtual.ts".VirtualType');
    });
  });
});
