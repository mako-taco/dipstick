import { FoundModule, ProcessedDependency } from '../../types';

export const foundModuleToProcessedDependencies = (
  module: FoundModule
): ProcessedDependency[] => {
  return (
    module.dependencies?.getElements().map(element => {
      return {
        text: element.getText(),
        type: element.getType(),
      };
    }) ?? []
  );
};
