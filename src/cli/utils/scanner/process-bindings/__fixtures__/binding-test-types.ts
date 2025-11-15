// Test interfaces
export interface IUserService {
  getUser(id: string): string;
}

export interface IEmailService {
  sendEmail(to: string, message: string): void;
}

export interface IDatabaseService {
  query(sql: string): string[];
}

// Test classes
export class UserService implements IUserService {
  constructor(private emailService: IEmailService) {}

  getUser(id: string): string {
    return `User: ${id}`;
  }
}

export class EmailService implements IEmailService {
  sendEmail(to: string, message: string): void {
    // Implementation
  }
}

export class DatabaseService implements IDatabaseService {
  constructor(
    private connectionString: string,
    private timeout: number
  ) {}

  query(sql: string): string[] {
    return [];
  }
}

export class SimpleService {
  constructor() {}

  doSomething(): string {
    return 'something';
  }
}

// Non-exported class (should cause error for non-static bindings)
class PrivateService {
  constructor() {}
}

// Factory function
export function createUserService(): UserService {
  return new UserService(new EmailService());
}

export const createEmailService = (): EmailService => {
  return new EmailService();
};

// Type aliases for static bindings
export type UserConfig = {
  apiUrl: string;
  timeout: number;
};

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
};

// Complex type for literal type testing
export type ComplexLiteralType = {
  nested: {
    value: string;
    count: number;
  };
  array: string[];
};

// Export the private service so we can reference it in tests
export { PrivateService as ExportedPrivateService };



