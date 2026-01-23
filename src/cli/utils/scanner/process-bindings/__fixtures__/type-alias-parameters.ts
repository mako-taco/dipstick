// Type aliases for primitive types
export type DatabaseUrl = string;
export type ApiKey = string;
export type Port = number;

// Type alias for complex type
export type ConfigOptions = {
  timeout: number;
  retries: number;
};

// Service that uses type alias parameters
export class TypeAliasService {
  constructor(
    public readonly connectionUrl: DatabaseUrl,
    public readonly apiKey: ApiKey,
    public readonly port: Port
  ) {}

  connect() {
    console.log(
      `Connecting to ${this.connectionUrl}:${this.port} with key ${this.apiKey}`
    );
  }
}

// Factory function that uses type alias parameters
export function createTypeAliasService(
  connectionUrl: DatabaseUrl,
  apiKey: ApiKey
): TypeAliasService {
  return new TypeAliasService(connectionUrl, apiKey, 5432);
}

// Function with mixed type alias and regular parameters
export function createMixedService(
  url: DatabaseUrl,
  regularString: string,
  config: ConfigOptions
): TypeAliasService {
  return new TypeAliasService(url, '', 5432);
}
