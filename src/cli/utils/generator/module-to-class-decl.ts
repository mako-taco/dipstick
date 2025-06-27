import {
  ClassDeclarationStructure,
  MethodDeclarationStructure,
  OptionalKind,
  ParameterDeclarationStructure,
  PropertyDeclarationStructure,
  Scope,
} from 'ts-morph';
import { ProcessedModule } from '../../types';
import { createMethodBody } from './create-method-body/create-method-body';
import { getPropertyNameForReusableBinding } from './property-names';

export const moduleToClassDecl = (
  module: ProcessedModule
): OptionalKind<ClassDeclarationStructure> => {
  const reusableBindings = module.bindings.filter(
    binding => binding.bindType === 'reusable'
  );

  const staticBindings = module.bindings.filter(
    binding => binding.bindType === 'static'
  );

  const staticBindingsType = `Readonly<{${staticBindings
    .map(
      binding =>
        `${binding.name}: ${binding.impl.declaration.getSymbol()?.getName()}`
    )
    .join('; ')}}>`;

  const dependencyModulesType = `readonly [${module.dependencies
    .map(dep => dep.text)
    .join(', ')}]`;

  const optionsProperties = [
    staticBindings.length > 0
      ? { name: '_static', type: staticBindingsType }
      : null,
    module.dependencies.length > 0
      ? { name: '_modules', type: dependencyModulesType }
      : null,
  ].filter(prop => prop !== null);

  const parameters = optionsProperties.map(
    prop =>
      ({
        name: prop.name,
        type: prop.type,
        isReadonly: true,
        scope: Scope.Private,
      }) satisfies OptionalKind<ParameterDeclarationStructure>
  );

  return {
    name: `${module.name}Impl`,
    isExported: true,
    isAbstract: false,
    implements: [module.name],
    ctors: [
      {
        parameters,
      },
    ],
    properties: [
      ...reusableBindings.map(
        binding =>
          ({
            name: getPropertyNameForReusableBinding(binding),
            type: binding.impl.declaration.getSymbol()?.getName(),
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
            returnType: binding.iface.declaration.getSymbol()?.getName(),
            parameters: [],
            statements: createMethodBody(module, binding),
          }) satisfies OptionalKind<MethodDeclarationStructure>
      ),
    ],
  };
};
