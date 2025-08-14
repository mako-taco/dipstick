import { Reusable, Static, Transient } from '../../../../../lib/index';

// Types and classes for testing
export interface ITestService {
  doSomething(): string;
}

export interface IRepository {
  getData(): string;
}

export interface ILogger {
  log(message: string): void;
}

export class TestService implements ITestService {
  doSomething(): string {
    return 'test';
  }
}

export class Repository implements IRepository {
  getData(): string {
    return 'data';
  }
}

export class Logger implements ILogger {
  log(message: string): void {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}

// Type literal structures for testing bindings
export type ReusableBindings = {
  testService: Reusable<TestService>;
};

export type TransientBindings = {
  testService: Transient<TestService, ITestService>;
};

export type StaticBindings = {
  testService: Static<ITestService>;
};

export type MultiBindings = {
  repository: Reusable<Repository>;
  logger: Transient<Logger, ILogger>;
  config: Static<ITestService>;
};

// Type with duplicate interface types - should cause error
export type DuplicateInterfaceBindings = {
  testService1: Reusable<TestService, ITestService>;
  testService2: Transient<TestService, ITestService>;
};

export function itsAFactoryFunction(): number {
  return 5;
}

export type FunctionBindings = {
  testService: Transient<typeof itsAFactoryFunction>;
};
