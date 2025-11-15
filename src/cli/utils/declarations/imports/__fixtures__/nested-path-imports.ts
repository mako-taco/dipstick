import { DeepNestedType } from '../../../../lib/deep/nested/path/types';
import { UtilFunction } from '../../utils/helper-functions';
import { ConfigType } from '../../../../../config/app-config';

export interface NestedPathExample {
  deepType: DeepNestedType;
  util: typeof UtilFunction;
  config: ConfigType;
}

export const processNestedPaths = (): NestedPathExample => {
  return {
    deepType: {} as DeepNestedType,
    util: UtilFunction,
    config: {} as ConfigType,
  };
};
