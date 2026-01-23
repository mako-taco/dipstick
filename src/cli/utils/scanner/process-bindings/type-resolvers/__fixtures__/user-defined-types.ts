// User-defined type aliases
export type DatabaseUrl = string;
export type ApiKey = string;
export type Port = number;

// Complex type alias
export type ConfigOptions = {
  timeout: number;
  retries: number;
};

// Function using type alias parameters
export function createConnection(
  connectionUrl: DatabaseUrl,
  apiKey: ApiKey
): void {
  console.log(`Connecting to ${connectionUrl} with key ${apiKey}`);
}

// Function using simple types
export function simpleFunction(name: string, count: number): string {
  return `${name}: ${count}`;
}

// Function using generic type reference
export function createService(config: ReturnType<typeof getConfig>): void {
  console.log(config);
}

export function getConfig() {
  return { host: 'localhost', port: 5432 };
}

// Class with constructor parameters
export class DatabaseService {
  constructor(
    public readonly url: DatabaseUrl,
    public readonly key: ApiKey
  ) {}
}
