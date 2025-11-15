import { SourceClass } from './source-module';

// Non-exported declarations
class NonExportedClass {
  private value: string = 'non-exported';

  getValue(): string {
    return this.value;
  }
}

const nonExportedConstant = 'not exported';

function nonExportedFunction(): void {
  console.log('This function is not exported');
}

interface NonExportedInterface {
  hidden: boolean;
}

type NonExportedType = 'hidden1' | 'hidden2';

const nonExportedArrowFunction = () => 'hidden';

// Some exported declarations for comparison
export class ExportedClass {
  public value: string = 'exported';
}

export const EXPORTED_CONSTANT = 'exported constant';

// Use the non-exported items internally
const useNonExported = (): void => {
  const instance = new NonExportedClass();
  console.log(instance.getValue(), nonExportedConstant);
  nonExportedFunction();
  console.log(nonExportedArrowFunction());
};
