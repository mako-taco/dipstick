import {
  ProcessedBinding,
  ProcessedDependency,
  ProcessedModule,
} from '../../types';

const DEPENDENCY_MODULE_PROPERTY_NAME = '_modules';
const STATIC_BINDINGS_PROPERTY_NAME = '_static';

export const getPropertyNameForDependency = (
  module: ProcessedModule,
  dependency: ProcessedDependency
): string => {
  const idx = module.dependencies.indexOf(dependency);
  return `${DEPENDENCY_MODULE_PROPERTY_NAME}[${idx}]`;
};

export const getPropertyNameForStaticBinding = (
  binding: ProcessedBinding
): string => {
  return `${STATIC_BINDINGS_PROPERTY_NAME}.${binding.name}`;
};

export const getPropertyNameForCachedBinding = (
  binding: ProcessedBinding
): string => {
  return `_${binding.name}`;
};
