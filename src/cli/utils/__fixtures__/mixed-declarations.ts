import { SourceClass, SourceInterface, sourceFunction } from './source-module';
import defaultUtil from '../declarations/imports/__fixtures__/source-files/utils';

// Mix of exported and non-exported declarations
export const exportedVariable = 'exported';
const nonExportedVariable = 'not exported';

export function exportedFunction(): string {
  return 'exported function';
}

function nonExportedFunction(): string {
  return 'not exported function';
}

export class ExportedClass {
  method(): void {
    console.log('Exported class method');
  }
}

class NonExportedClass {
  method(): void {
    console.log('Non-exported class method');
  }
}

export interface ExportedInterface {
  exported: boolean;
}

interface NonExportedInterface {
  hidden: boolean;
}

export type ExportedType = 'exported1' | 'exported2';
type NonExportedType = 'hidden1' | 'hidden2';

// Use all the imports and declarations
export const useMixed = (): void => {
  const source = new SourceClass();
  const local = new ExportedClass();
  const hidden = new NonExportedClass();
  const result = defaultUtil('test');
  const funcResult = sourceFunction();

  source.method();
  local.method();
  hidden.method();
  console.log(result, funcResult);
  console.log(exportedVariable, nonExportedVariable);
};
