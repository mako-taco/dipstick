import {
  ClassDeclarationStructure,
  MethodDeclarationStructure,
  OptionalKind,
  PropertyDeclarationStructure,
  Scope,
} from 'ts-morph';
import { ProcessedModule } from '../../types';
import { createMethodBody } from './create-method-body/create-method-body';
import { getPropertyNameForCachedBinding } from './property-names';

export const moduleToClassDecl = (
  module: ProcessedModule
): OptionalKind<ClassDeclarationStructure> => {
  const reusableBindings = module.bindings.filter(
    binding => binding.bindType === 'reusable'
  );

  const staticBindings = module.bindings.filter(
    binding => binding.bindType === 'static'
  );

  const staticBindingsType = `{${staticBindings
    .map(
      binding =>
        `readonly ${binding.name}: ${binding.implType.getSymbol()?.getName()}`
    )
    .join(', ')}}`;

  const dependencyModulesType = `readonly [${module.dependencies
    .map(dep => dep.text)
    .join(', ')}]`;

  return {
    name: `${module.name}Impl`,
    isExported: true,
    isAbstract: false,
    implements: [module.name],
    ctors: [
      {
        parameters: [
          {
            name: '_options',
            type: `{readonly staticBindings: ${staticBindingsType}, dependencyModules: ${dependencyModulesType}}`,
            scope: Scope.Private,
          },
        ],
      },
    ],
    properties: [
      ...reusableBindings.map(
        binding =>
          ({
            name: getPropertyNameForCachedBinding(binding),
            type: binding.implType.getSymbol()?.getName(),
            hasQuestionToken: true,
            isReadonly: false,
            scope: Scope.Private,
          }) satisfies OptionalKind<PropertyDeclarationStructure>
      ),
    ],
    methods: [
      ...module.bindings.map(
        binding =>
          ({
            name: `${binding.name}`,
            isStatic: false,
            isAsync: false,
            returnType: binding.ifaceType.getSymbol()?.getName(),
            parameters: [],
            statements: createMethodBody(module, binding),
          }) satisfies OptionalKind<MethodDeclarationStructure>
      ),
    ],
  };
};
