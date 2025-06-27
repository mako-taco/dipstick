import { Project, PropertySignature, SyntaxKind } from 'ts-morph';
import { FoundModule, ProcessedBinding } from '../../../types';
import { CodegenError } from '../../../error';
import { resolveTypeToClass, resolveType } from '../resolve';

export const foundModuleToProcessedBindings = (
  module: FoundModule,
  project: Project
): ProcessedBinding[] => {
  return (
    module.bindings?.getProperties().map(property => {
      const bindType = getBindingTypeFromProperty(property);
      const typeArgs = property
        .getTypeNode()
        ?.asKind(SyntaxKind.TypeReference)
        ?.getTypeArguments();

      if (!typeArgs) {
        throw new CodegenError(
          property,
          `Could not find type arguments for binding ${property.getName()}. Bindings MUST be in the form of 'name: dip.Bind.(Reusable|Static|Transient)<T>`
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
    }) ?? []
  );
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
