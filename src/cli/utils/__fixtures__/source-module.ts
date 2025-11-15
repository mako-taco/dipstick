export class SourceClass {
  method(): void {
    console.log('Source class method');
  }
}

export interface SourceInterface {
  value: string;
}

export const SOURCE_CONSTANT = 'source constant';

export function sourceFunction(): string {
  return 'source function';
}

export type SourceType = 'type1' | 'type2';
