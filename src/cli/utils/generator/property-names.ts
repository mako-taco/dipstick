import { Binding, ProcessedDependency, ProcessedContainer } from '../../types';

const DEPENDENCY_MODULE_PROPERTY_NAME = '__modules';
const STATIC_BINDINGS_PROPERTY_NAME = '__static';
const REUSABLE_BINDINGS_CACHE_PROPERTY_NAME = '__reusable';

export const getPropertyNameForDependencies = () =>
  DEPENDENCY_MODULE_PROPERTY_NAME;

export const getPropertyNameForStaticBindings = () =>
  STATIC_BINDINGS_PROPERTY_NAME;

export const getPropertyNameForDependency = (
  module: ProcessedContainer,
  dependency: ProcessedDependency
): string => {
  const idx = module.dependencies.indexOf(dependency);
  return `${DEPENDENCY_MODULE_PROPERTY_NAME}[${idx}]`;
};

export const getPropertyNameForStaticBinding = (binding: Binding): string => {
  return `${STATIC_BINDINGS_PROPERTY_NAME}.${binding.name}`;
};

export const getPropertyNameForReusableBinding = (binding: Binding): string => {
  return `${REUSABLE_BINDINGS_CACHE_PROPERTY_NAME}.${binding.name}`;
};

export const getPropertyNameForReusableBindings = () =>
  REUSABLE_BINDINGS_CACHE_PROPERTY_NAME;
