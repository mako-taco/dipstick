class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get(path: string): Promise<any> {
    return fetch(`${this.baseUrl}${path}`);
  }
}

const API_VERSION = 'v1';
const MAX_RETRIES = 3;

interface ApiResponse<T> {
  data: T;
  status: number;
}

const createClient = (baseUrl: string): HttpClient => {
  return new HttpClient(baseUrl);
};

// Export using export declarations (export { ... } syntax)
export { HttpClient, API_VERSION, MAX_RETRIES, ApiResponse };
export default createClient;
