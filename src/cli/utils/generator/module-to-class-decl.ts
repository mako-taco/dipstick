import {
  ClassDeclarationStructure,
  MethodDeclarationStructure,
  OptionalKind,
  ParameterDeclarationStructure,
  PropertyDeclarationStructure,
} from 'ts-morph';
import { ProcessedContainer } from '../../types';
import { createMethodBody as createMethodBodyFactory } from './create-method-body/create-method-body';
import {
  getPropertyNameForDependencies,
  getPropertyNameForReusableBindings,
  getPropertyNameForStaticBindings,
} from './property-names';
import { ILogger } from '../../logger';

export const moduleToClassDecl =
  (logger: ILogger) =>
  (module: ProcessedContainer): OptionalKind<ClassDeclarationStructure> => {
    const createMethodBody = createMethodBodyFactory(logger);
    logger.debug(`Generating class declaration for module ${module.name}...`);
    const reusableBindings = module.bindings.filter(
      binding => binding.bindType === 'reusable'
    );

    const staticBindings = module.bindings.filter(
      binding => binding.bindType === 'static'
    );

    const staticBindingsType = `Readonly<{${staticBindings
      .map(binding => `${binding.name}: ${binding.iface.name}`)
      .join('; ')}}>`;

    const dependencyContainersType = `readonly [${module.dependencies
      .map(dep => dep.text)
      .join(', ')}]`;

    const optionsProperties = [
      staticBindings.length > 0
        ? { name: 'staticBindings', type: staticBindingsType }
        : null,
      module.dependencies.length > 0
        ? {
            name: 'dependencyContainers',
            type: dependencyContainersType,
          }
        : null,
    ].filter(prop => prop !== null);

    logger.debug(
      `↳ Found ${staticBindings.length} static bindings and ${module.dependencies.length} dependencies.`
    );

    const parameters = optionsProperties.map<
      OptionalKind<ParameterDeclarationStructure>
    >(prop => ({
      name: prop.name,
      type: prop.type,
    }));

    return {
      name: `${module.name}Impl`,
      isExported: true,
      isAbstract: false,
      implements: [module.name],
      ctors: [
        {
          parameters,
          statements: [
            module.dependencies.length > 0
              ? `this.${getPropertyNameForDependencies()} = dependencyContainers`
              : null,
            staticBindings.length > 0
              ? `this.${getPropertyNameForStaticBindings()} = staticBindings`
              : null,
          ].filter(statement => statement !== null),
        },
      ],
      properties: [
        {
          name: getPropertyNameForReusableBindings(),
          type: `{${reusableBindings.map(binding => `${binding.name}?: ${binding.impl.name}`).join(', ')}}`,
          isReadonly: true,
          initializer: `{}`,
        } satisfies OptionalKind<PropertyDeclarationStructure>,
        {
          name: getPropertyNameForDependencies(),
          type: dependencyContainersType,
          isReadonly: true,
        } satisfies OptionalKind<PropertyDeclarationStructure>,
        {
          name: getPropertyNameForStaticBindings(),
          type: staticBindingsType,
          isReadonly: true,
        } satisfies OptionalKind<PropertyDeclarationStructure>,
      ],
      methods: [
        ...module.bindings.map(
          binding =>
            ({
              name: `${binding.name}`,
              isStatic: false,
              isAsync: false,
              returnType: binding.iface.name,
              parameters: [],
              statements: createMethodBody(module, binding),
            }) satisfies OptionalKind<MethodDeclarationStructure>
        ),
      ],
    };
  };
