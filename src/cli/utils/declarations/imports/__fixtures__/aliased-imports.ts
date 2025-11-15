import {
  Logger as AppLogger,
  DefaultLogger as CustomLogger,
} from './source-files/logger';
import { User as AppUser, Config as AppConfig } from './source-files/types';
import defaultUtil, { formatString as formatter } from './source-files/utils';

export const useAliasedImports = (): void => {
  const logger: AppLogger = new CustomLogger();
  const user: AppUser = { id: 1, name: 'Test', email: 'test@example.com' };
  const config: AppConfig = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
  };
  const result = defaultUtil('test');
  const formatted = formatter('  TEST STRING  ');

  logger.log(`User: ${user.name}, Formatted: ${formatted}, Result: ${result}`);
};
