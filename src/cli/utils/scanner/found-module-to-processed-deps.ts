import { Project } from 'ts-morph';
import { ErrorWithContext } from '../../error';
import { FoundModule, ProcessedDependency } from '../../types';
import { resolveTypeToInterfaceOrTypeAlias } from './resolve';

export const foundModuleToProcessedDependencies = (
  module: FoundModule,
  project: Project
): ProcessedDependency[] => {
  return (
    module.dependencies?.getElements().map(element => {
      const type = element.getType();
      const result = resolveTypeToInterfaceOrTypeAlias(
        type,
        module.filePath,
        project
      );
      if (result.error !== null) {
        throw new ErrorWithContext(element, result.error);
      }

      const { resolvedType } = result;

      return {
        text: element.getText(),
        type: resolvedType,
        pos: [element.getStart(), element.getEnd()],
      };
    }) ?? []
  );
};
