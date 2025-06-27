import { IService, IRepository, ILogger } from './interfaces';

export class Service implements IService {
  constructor(
    private repo: IRepository,
    private logger: ILogger
  ) {}
  doSomething(): string {
    return 'service';
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

export class ServiceWithNoConstructor implements IService {
  doSomething(): string {
    return 'no constructor';
  }
}

export class ServiceWithNoParams implements IService {
  constructor() {}
  doSomething(): string {
    return 'no params';
  }
}

export class ServiceWithOneParam implements IService {
  constructor(private repo: IRepository) {}
  doSomething(): string {
    return 'one param';
  }
}
