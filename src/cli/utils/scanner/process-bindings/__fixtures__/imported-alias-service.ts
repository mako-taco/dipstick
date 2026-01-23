// Service in a SEPARATE file that imports the type alias
import type { ApiKey, ServiceUrl } from './imported-alias-types';

export class ImportedAliasService {
  constructor(
    private apiKey: ApiKey,
    private serviceUrl: ServiceUrl
  ) {}

  getKey(): string {
    return this.apiKey;
  }
}

export function createImportedAliasService(
  apiKey: ApiKey,
  serviceUrl: ServiceUrl
): ImportedAliasService {
  return new ImportedAliasService(apiKey, serviceUrl);
}
