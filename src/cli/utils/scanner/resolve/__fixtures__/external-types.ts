// Types that simulate external module references for testing cross-file resolution

export interface IApiClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: unknown): Promise<T>;
}

export interface IConfigService {
  getApiUrl(): string;
  getTimeout(): number;
}

export class HttpClient implements IApiClient {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json() as T;
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json() as T;
  }
}

export class ConfigService implements IConfigService {
  getApiUrl(): string {
    return process.env.API_URL || 'http://localhost:3000';
  }

  getTimeout(): number {
    return parseInt(process.env.TIMEOUT || '5000', 10);
  }
}

export abstract class BaseService {
  protected abstract serviceName: string;

  protected log(message: string): void {
    console.log(`[${this.serviceName}] ${message}`);
  }
}

export class DataService extends BaseService {
  protected serviceName = 'DataService';

  fetchData(): Promise<unknown> {
    this.log('Fetching data...');
    return Promise.resolve({ data: 'mock data' });
  }
}

export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type ErrorResponse = {
  error: string;
  code: number;
  details?: Record<string, unknown>;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type RequestConfig = {
  method: HttpMethod;
  headers?: Record<string, string>;
  timeout?: number;
};
