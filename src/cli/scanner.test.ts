import { Project } from 'ts-morph';
import { Scanner } from './scanner';
import { NoOpLogger } from './logger';
import path from 'path';

describe('scanner', () => {
  it('should scan a file', () => {
    const projectRoot = path.resolve(__dirname, '../../example/scanner-test');
    const project = new Project({
      tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
    });
    const scanner = new Scanner(project, NoOpLogger);
    const thisProjectRoot = path.resolve(__dirname, '../../');
    const { main, types } = require(
      path.resolve(thisProjectRoot, 'package.json')
    );

    const libraryImportPath = path.resolve(thisProjectRoot, types);

    const foundModules = scanner.findModules();

    debugger;
  });
});
