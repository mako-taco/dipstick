export interface IImportedService {
  process(): string;
}

export class ImportedImplementation implements IImportedService {
  constructor(private config: string) {}

  process(): string {
    return 'imported';
  }
}

export function importedFactory(): ImportedImplementation {
  return new ImportedImplementation('test');
}

export type ImportedConfig = {
  setting: string;
  enabled: boolean;
};



