class Logger {
  log(message: string): void {
    console.log(message);
  }
}

const DEFAULT_TIMEOUT = 5000;

interface User {
  id: number;
  name: string;
  email: string;
}

type Status = 'pending' | 'success' | 'error';

function createLogger(): Logger {
  return new Logger();
}

const formatMessage = (msg: string): string => {
  return `[LOG] ${msg}`;
};

// Export using export declarations (export { ... } syntax)
export { Logger, DEFAULT_TIMEOUT, User, Status, createLogger, formatMessage };
