import {
  ProcessedBinding,
  ProcessedDependency,
  ProcessedContainer,
} from '../../types';

const DEPENDENCY_MODULE_PROPERTY_NAME = '_modules';
const STATIC_BINDINGS_PROPERTY_NAME = '_static';
const REUSABLE_BINDINGS_CACHE_PROPERTY_NAME = '_reusable';

export const getPropertyNameForDependency = (
  module: ProcessedContainer,
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

export const getPropertyNameForReusableBinding = (
  binding: ProcessedBinding
): string => {
  return `${REUSABLE_BINDINGS_CACHE_PROPERTY_NAME}.${binding.name}`;
};
