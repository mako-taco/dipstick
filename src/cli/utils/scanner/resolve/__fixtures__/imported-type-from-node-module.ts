// File that imports types from external modules to test import resolution
import { SomeExternalType } from 'external-package';
import type { TypeFromTypePackage } from '@types/some-package';
import { Project as TsMorphProject } from 'ts-morph';

export interface IServiceWithImportedType {
  processData(data: SomeExternalType): TypeFromTypePackage;
  getProject(): TsMorphProject;
}

export class ServiceWithImportedType implements IServiceWithImportedType {
  processData(data: SomeExternalType): TypeFromTypePackage {
    return data as TypeFromTypePackage;
  }

  getProject(): TsMorphProject {
    return new TsMorphProject();
  }
}

// Re-export for testing
export type { SomeExternalType } from 'external-package';
export { TsMorphProject };
