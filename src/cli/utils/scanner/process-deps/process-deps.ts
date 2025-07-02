import { FoundContainer, ProcessedDependency } from '../../../types';

export const foundContainerToProcessedDependencies = (
  module: FoundContainer
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
