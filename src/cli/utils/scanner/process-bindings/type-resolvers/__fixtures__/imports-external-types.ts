import { ExternalApiKey, ExternalServiceUrl } from './external-types';

// Function using imported type aliases
export function createExternalService(
  apiKey: ExternalApiKey,
  serviceUrl: ExternalServiceUrl
): void {
  console.log(`Creating service at ${serviceUrl} with key ${apiKey}`);
}

// Class using imported type aliases
export class ExternalService {
  constructor(
    public readonly apiKey: ExternalApiKey,
    public readonly serviceUrl: ExternalServiceUrl
  ) {}
}
