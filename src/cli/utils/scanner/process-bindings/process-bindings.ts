import { Project, PropertySignature, SyntaxKind } from 'ts-morph';
import { FoundContainer, ProcessedBinding } from '../../../types';
import { CodegenError } from '../../../error';
import { resolveTypeToClass, resolveType } from '../resolve';

export const foundContainerToProcessedBindings = (
  module: FoundContainer,
  project: Project
): ProcessedBinding[] => {
  const processedBindings =
    module.bindings?.getProperties().map(property => {
      const bindType = getBindingTypeFromProperty(property);
      const typeArgs = property
        .getTypeNode()
        ?.asKind(SyntaxKind.TypeReference)
        ?.getTypeArguments();

      if (!typeArgs) {
        throw new CodegenError(
          property,
          `Could not find type arguments for binding ${property.getName()}. Bindings MUST be in the form of 'name: (Reusable|Static|Transient)<T>`
        );
      }

      const implType = typeArgs[0].getType();

      // Static bindings don't need impl types to be classes, because they are
      // provided to the module's constructor.
      const implTypeResult =
        bindType === 'static'
          ? resolveType(implType, module.filePath, project)
          : resolveTypeToClass(implType, module.filePath, project);

      if (implTypeResult.error !== null) {
        throw new CodegenError(property, implTypeResult.error);
      }

      const ifaceType = (typeArgs[1] ?? typeArgs[0]).getType();
      const ifaceTypeResult = resolveType(ifaceType, module.filePath, project);
      if (ifaceTypeResult.error !== null) {
        throw new CodegenError(property, ifaceTypeResult.error);
      }

      return {
        name: property.getName(),
        bindType,
        impl: {
          declaration: implTypeResult.resolvedType,
          fqn: implTypeResult.resolvedType.getSymbol()!.getFullyQualifiedName(),
        },
        iface: {
          declaration: ifaceTypeResult.resolvedType,
          fqn: ifaceTypeResult.resolvedType
            .getSymbol()!
            .getFullyQualifiedName(),
        },
      } as ProcessedBinding; // TODO
    }) ?? [];

  // Prevent two bindings on the same module which return the same type
  for (let i = 1; i < processedBindings.length; i++) {
    for (let j = 0; j < i; j++) {
      if (processedBindings[i].iface.fqn === processedBindings[j].iface.fqn) {
        throw new CodegenError(
          processedBindings[i].iface.declaration,
          `Binding ${processedBindings[i].name} conflicts with ${processedBindings[j].name}. Bindings on the same module must return unique type aliases.`
        );
      }
    }
  }

  return processedBindings;
};

const getBindingTypeFromProperty = (
  property: PropertySignature
): 'reusable' | 'transient' | 'static' => {
  const propertyTypeText = property.getType().getText();
  return propertyTypeText.indexOf('Reusable') !== -1
    ? 'reusable'
    : propertyTypeText.indexOf('Transient') !== -1
      ? 'transient'
      : propertyTypeText.indexOf('Static') !== -1
        ? 'static'
        : (() => {
            throw new CodegenError(property, 'Unknown binding type');
          })();
};
