class Logger {
  log(message: string): void {
    console.log(message);
  }
}

class DatabaseLogger extends Logger {
  logToDb(message: string): void {
    console.log(`DB: ${message}`);
  }
}

const DEFAULT_TIMEOUT = 5000;
const MAX_RETRIES = 3;

interface User {
  id: number;
  name: string;
}

interface Config {
  apiUrl: string;
  timeout: number;
}

function createLogger(): Logger {
  return new Logger();
}

function createDbLogger(): DatabaseLogger {
  return new DatabaseLogger();
}

// Multiple separate export declarations
export { Logger, createLogger };
export { DatabaseLogger, createDbLogger };
export { DEFAULT_TIMEOUT, MAX_RETRIES };
export { User, Config };
