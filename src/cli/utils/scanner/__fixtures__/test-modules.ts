import { dip } from '../../../../lib';

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
  testService: dip.Bind.Reusable<TestService>;
};

export type TransientBindings = {
  testService: dip.Bind.Transient<TestService, ITestService>;
};

export type StaticBindings = {
  testService: dip.Bind.Static<ITestService>;
};

export type MultiBindings = {
  repository: dip.Bind.Reusable<Repository>;
  logger: dip.Bind.Transient<Logger, ILogger>;
  config: dip.Bind.Static<ITestService>;
};
