import { SourceClass, SourceInterface } from './source-module';
import { Logger } from '../declarations/imports/__fixtures__/source-files/logger';
import defaultUtil from '../declarations/imports/__fixtures__/source-files/utils';

// Local exported declarations
export class LocalClass {
  process(): void {
    console.log('Local class processing');
  }
}

export const LOCAL_CONSTANT = 'local constant';

export function localFunction(): string {
  return 'local function';
}

export type LocalType = 'local1' | 'local2';

export interface LocalInterface {
  id: number;
  name: string;
}

export const localArrowFunction = (): boolean => true;

// Using imported items to make them meaningful
export const useImports = (): void => {
  const source = new SourceClass();
  const logger = new Logger();
  const result = defaultUtil('test');

  source.method();
  logger.log('Using imports');
  console.log(result);
};
