import { SourceFile, ImportDeclaration, Node } from 'ts-morph';
import { Logger, Scanner } from '../../../logger';
import { ProcessBindingResult, ScanResult } from '../../../types';

export interface BasicInterface {
  name: string;
  value: number;
}

export const basicFunction = (): void => {
  console.log('Basic function');
};
