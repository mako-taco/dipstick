export interface IService {
  doSomething(): string;
}

export interface IRepository {
  getData(): string;
}

export interface ILogger {
  log(message: string): void;
}

export interface IDependencyModule {
  getService(): IService;
  getRepository(): IRepository;
  getLogger(): ILogger;
}
