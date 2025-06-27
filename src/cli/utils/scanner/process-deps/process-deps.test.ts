import { Project, SourceFile, SyntaxKind, TupleTypeNode } from 'ts-morph';
import path from 'path';
import { FoundModule } from '../../../types';
import { foundModuleToProcessedDependencies } from './process-deps';

describe('process-deps', () => {
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
      path.join(__dirname, '__fixtures__/test-deps.ts')
    );
  });

  // Helper function to get TupleTypeNode from type alias
  const getDependenciesFromTypeAlias = (
    typeAliasName: string
  ): TupleTypeNode => {
    const typeAlias = fixturesFile.getTypeAlias(typeAliasName);
    if (!typeAlias) {
      throw new Error(`Type alias ${typeAliasName} not found in fixtures`);
    }

    const typeNode = typeAlias.getTypeNode();
    if (!typeNode) {
      throw new Error(`Type node not found for ${typeAliasName}`);
    }

    const tupleType = typeNode.asKind(SyntaxKind.TupleType);
    if (!tupleType) {
      throw new Error(`Expected TupleTypeNode for ${typeAliasName}`);
    }

    return tupleType;
  };

  describe('foundModuleToProcessedDependencies', () => {
    it('should process single dependency', () => {
      const dependencies = getDependenciesFromTypeAlias('DepsB');

      const foundModule: FoundModule = {
        name: 'ModuleB',
        filePath: path.join(__dirname, '__fixtures__/test-deps.ts'),
        dependencies,
      };

      const result = foundModuleToProcessedDependencies(foundModule);

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('ModuleA');
    });

    it('should process multiple dependencies', () => {
      const dependencies = getDependenciesFromTypeAlias('DepsD');

      const foundModule: FoundModule = {
        name: 'ModuleD',
        filePath: path.join(__dirname, '__fixtures__/test-deps.ts'),
        dependencies,
      };

      const result = foundModuleToProcessedDependencies(foundModule);

      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('ModuleA');
      expect(result[1].text).toBe('ModuleB');
      expect(result[2].text).toBe('ModuleC');
    });

    it('should return empty array when no dependencies exist', () => {
      const foundModule: FoundModule = {
        name: 'TestModule',
        filePath: path.join(__dirname, '__fixtures__/test-deps.ts'),
        // No dependencies property
      };

      const result = foundModuleToProcessedDependencies(foundModule);

      expect(result).toEqual([]);
    });

    it('should preserve dependency order', () => {
      const dependencies = getDependenciesFromTypeAlias('DepsD');

      const foundModule: FoundModule = {
        name: 'ModuleD',
        filePath: path.join(__dirname, '__fixtures__/test-deps.ts'),
        dependencies,
      };

      const result = foundModuleToProcessedDependencies(foundModule);

      // Verify order is preserved as defined in the type
      expect(result.map(d => d.text)).toEqual([
        'ModuleA',
        'ModuleB',
        'ModuleC',
      ]);
    });
  });
});
