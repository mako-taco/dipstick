import DefaultInterface from './source-files/types';
import defaultUtilFunction from './source-files/utils';

export const useDefaultImports = (): void => {
  const defaultObj: DefaultInterface = { value: 'test' };
  const result = defaultUtilFunction('input');

  console.log(defaultObj.value, result);
};
