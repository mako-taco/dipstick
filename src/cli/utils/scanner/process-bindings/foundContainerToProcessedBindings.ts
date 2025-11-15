import { PropertySignature, SyntaxKind, TypeNode } from 'ts-morph';
import { FoundContainer, Binding } from '../../../types';
import { CodegenError } from '../../../error';
import {
  getStaticBinding as _getStaticBinding,
  getNonStaticBinding as _getNonStaticBinding,
} from './getBinding';

export const foundContainerToProcessedBindings =
  (
    getStaticBinding = _getStaticBinding(),
    getNonStaticBinding = _getNonStaticBinding()
  ) =>
  (module: FoundContainer): Binding[] => {
    const processedBindings: Binding[] =
      module.bindings?.getProperties().map((property): Binding => {
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

        const hasOneOrTwoElements = (
          arg: TypeNode[]
        ): arg is [TypeNode, TypeNode] | [TypeNode] =>
          arg.length === 1 || arg.length === 2;

        if (!hasOneOrTwoElements(typeArgs)) {
          throw new CodegenError(property, `TypeArgs malformed?`);
        }

        if (bindType === 'static') {
          return getStaticBinding({
            name: property.getName(),
            typeArgs,
          });
        } else {
          return getNonStaticBinding({
            name: property.getName(),
            bindType,
            typeArgs,
          });
        }
      }) ?? [];

    // Prevent two bindings on the same module which return the same type
    for (let i = 1; i < processedBindings.length; i++) {
      for (let j = 0; j < i; j++) {
        if (
          processedBindings[i].boundTo.fqnOrLiteralTypeText ===
          processedBindings[j].boundTo.fqnOrLiteralTypeText
        ) {
          throw new CodegenError(
            processedBindings[i].boundTo.node,
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
