import defaultUtil, { formatString, delay } from './source-files/utils';
import DefaultInterface, { User, Status } from './source-files/types';

export const useMixedImports = async (): Promise<void> => {
  const defaultObj: DefaultInterface = { value: 'test' };
  const user: User = { id: 1, name: 'Test', email: 'test@example.com' };
  const status: Status = 'success';
  const result = defaultUtil('input');
  const formatted = formatString('  MIXED IMPORTS  ');

  await delay(100);
  console.log(defaultObj.value, user.name, status, result, formatted);
};
