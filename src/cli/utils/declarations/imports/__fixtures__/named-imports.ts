import { Logger, DefaultLogger, createLogger } from './source-files/logger';
import { User, Config, Status } from './source-files/types';

export const useNamedImports = (): void => {
  const logger: Logger = new DefaultLogger();
  const user: User = { id: 1, name: 'Test', email: 'test@example.com' };
  const config: Config = { apiUrl: 'https://api.example.com', timeout: 5000 };
  const status: Status = 'pending';

  logger.log(`User: ${user.name}, Status: ${status}`);
  console.log(`Config: ${config.apiUrl}`);
};
