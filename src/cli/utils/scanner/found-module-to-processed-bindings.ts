import { Project, PropertySignature, SyntaxKind } from 'ts-morph';
import { FoundModule, ProcessedBinding } from '../../types';
import { ErrorWithContext } from '../../error';
import { resolveTypeToClass, resolveType } from './resolve';

export const foundModuleToProcessedBindings = (
  module: FoundModule,
  project: Project
): ProcessedBinding[] => {
  return (
    module.bindings?.getProperties().map(property => {
      const typeArgs = property
        .getTypeNode()
        ?.asKind(SyntaxKind.TypeReference)
        ?.getTypeArguments();

      if (!typeArgs) {
        throw new ErrorWithContext(
          property,
          `Could not find type arguments for binding ${property.getName()}. Bindings MUST be in the form of 'name: dip.Bind.(Reusable|Static|Transient)<T>`
        );
      }

      const implType = typeArgs[0].getType();
      const implTypeResult = resolveTypeToClass(
        implType,
        module.filePath,
        project
      );
      if (implTypeResult.error !== null) {
        throw new ErrorWithContext(property, implTypeResult.error);
      }

      const ifaceType = (typeArgs[1] ?? typeArgs[0]).getType();
      const ifaceTypeResult = resolveType(ifaceType, module.filePath, project);
      if (ifaceTypeResult.error !== null) {
        throw new ErrorWithContext(property, ifaceTypeResult.error);
      }

      return {
        name: property.getName(),
        bindType: getBindingTypeFromProperty(property),
        pos: [property.getStart(), property.getEnd()],
        implType: implTypeResult.resolvedType,
        ifaceType: ifaceTypeResult.resolvedType,
      };
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
            throw new Error('Unknown binding type');
          })();
};
