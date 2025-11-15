export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Config {
  apiUrl: string;
  timeout: number;
}

export type Status = 'pending' | 'success' | 'error';

export default interface DefaultInterface {
  value: string;
}
