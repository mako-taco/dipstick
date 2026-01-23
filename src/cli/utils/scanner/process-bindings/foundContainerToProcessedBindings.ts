import { PropertySignature, SyntaxKind, TypeNode } from 'ts-morph';
import { FoundContainer, Binding } from '../../../types';
import { CodegenError } from '../../../error';
import {
  getStaticBinding as _getStaticBinding,
  getNonStaticBinding as _getNonStaticBinding,
} from './getBinding';
import { ILogger } from '../../../logger';
/**
 * Converts a FoundContainer (parsed from source) to an array of processed Binding objects.
 *
 * This mainly:
 *  - Retrieves properties from the container's 'bindings' interface/type.
 *  - Determines the binding type (Reusable, Transient, Static) for each property.
 *  - Extracts type arguments and validates them (must have 1 or 2 type arguments).
 *  - Calls either getStaticBinding or getNonStaticBinding to process and normalize the binding for code generation.
 *
 * @param logger - Logger for verbose/debug output.
 * @param getStaticBinding - Function returning the static binding parser (defaults to impl from getBinding).
 * @param getNonStaticBinding - Function returning the non-static binding parser (defaults to impl from getBinding).
 * @returns Function which takes a FoundContainer and returns an array of normalized Binding objects.
 */

export const foundContainerToProcessedBindings =
  (
    logger: ILogger,
    getStaticBinding = _getStaticBinding(logger),
    getNonStaticBinding = _getNonStaticBinding(logger)
  ) =>
  (module: FoundContainer): Binding[] => {
    const properties = module.bindings?.getProperties() ?? [];
    logger.debug(
      `[DEBUG] foundContainerToProcessedBindings: Processing ${properties.length} properties`
    );
    const processedBindings: Binding[] = properties.map(
      (property, idx): Binding => {
        logger.debug(
          `[DEBUG] ↳ Processing property ${idx + 1}/${properties.length}: ${property.getName()}`
        );
        const bindType = getBindingTypeFromProperty(property);
        logger.debug(`[DEBUG]   ↳ Binding type: ${bindType}`);
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
          logger.debug(`[DEBUG]   ↳ Calling getStaticBinding...`);
          const result = getStaticBinding({
            name: property.getName(),
            typeArgs,
          });
          logger.debug(`[DEBUG]   ↳ getStaticBinding done`);
          return result;
        } else {
          logger.debug(`[DEBUG]   ↳ Calling getNonStaticBinding...`);
          const result = getNonStaticBinding({
            name: property.getName(),
            bindType,
            typeArgs,
          });
          logger.debug(`[DEBUG]   ↳ getNonStaticBinding done`);
          return result;
        }
      }
    );

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
