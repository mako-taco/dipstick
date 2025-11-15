export interface Logger {
  log(message: string): void;
  error(message: string): void;
}

export class DefaultLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }
}

export const createLogger = (): Logger => {
  return new DefaultLogger();
};
