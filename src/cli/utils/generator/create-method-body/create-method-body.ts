import { SyntaxKind } from 'ts-morph';
import { Binding, ProcessedContainer } from '../../../types';

import { CodegenError } from '../../../error';
import { normalizeTypeName } from '../../normalizeTypeName';
import {
  getPropertyNameForReusableBinding,
  getPropertyNameForDependency,
  getPropertyNameForStaticBinding,
} from '../property-names';
import { ILogger } from '../../../logger';

/**
 * Creates the method body for a binding method.
 *
 * The binding method will either instantiate a new object, return a cached object, or delegate
 * to a dependency module.
 *
 * When constructing a new object, constructor parameters are resolved in the following order:
 * 1. This module's bindings
 * 2. This module's dependencies bindings, in the order the dependency modules are listed in the module's `dependencies` property
 */
export const createMethodBody =
  (logger: ILogger) =>
  (module: ProcessedContainer, binding: Binding): string => {
    const lines = [];

    if (binding.bindType === 'reusable') {
      lines.push(
        `if (this.${getPropertyNameForReusableBinding(binding)}) return this.${getPropertyNameForReusableBinding(binding)};`
      );
    }

    if (binding.bindType === 'static') {
      lines.push(`return this.${getPropertyNameForStaticBinding(binding)};`);
      return lines.join('\n');
    }

    // For non-static bindings, get implementation details
    const isClass = binding.implementedBy.isClass;
    const ctorParams = binding.implementedBy.parameters;

    // For typeof bindings, extract the function name from FQN, otherwise use the type text
    let classOrFactoryName: string;
    if (binding.implementedBy.usesTypeofKeyword) {
      // Extract the function name from the FQN (e.g., "/path/to/file".functionName -> functionName)
      const fqnParts = binding.implementedBy.fqn.split('.');
      const functionName = fqnParts[fqnParts.length - 1];
      classOrFactoryName = functionName;
    } else {
      classOrFactoryName = binding.implementedBy.typeText;
    }

    logger.debug(
      `Possible bindings: \n\t${module.bindings
        .map(binding => binding.boundTo.fqnOrLiteralTypeText)
        .join('\n\t')}`
    );
    const resolvedCtorParams = ctorParams.map(param => {
      logger.debug(
        `↳ Resolving parameter ${param.name} (${param.fqnOrLiteralTypeText})...`
      );

      // Resolve on this module's bindings, first
      const matchedBinding = module.bindings.find(
        binding =>
          binding.boundTo.fqnOrLiteralTypeText === param.fqnOrLiteralTypeText
      );

      if (matchedBinding) {
        logger.debug(
          `↳ Resolved parameter ${param.name} to binding ${matchedBinding.name}`
        );
        return `this.${matchedBinding.name}()`;
      }

      for (const dep of module.dependencies) {
        for (const prop of dep.type.getProperties()) {
          const propertyDecl = prop.getDeclarations()[0];

          const signature =
            propertyDecl.asKind(SyntaxKind.PropertySignature) ??
            propertyDecl.asKind(SyntaxKind.MethodSignature);

          if (!signature) {
            throw new CodegenError(
              propertyDecl,
              `Expected a property signature for \`${
                dep.text
              }.${prop.getName()}\``
            );
          }

          const methodReturnType = signature
            .getType()
            .getCallSignatures()[0]
            ?.getReturnType();

          if (!methodReturnType) {
            throw new CodegenError(
              propertyDecl,
              `Expected a method signature with a return type for \`${
                dep.text
              }.${prop.getName()}\``
            );
          }

          const methodReturnTypeName = methodReturnType
            .getSymbol()
            ?.getFullyQualifiedName();
          if (
            methodReturnTypeName &&
            normalizeTypeName(
              methodReturnTypeName,
              propertyDecl.getSourceFile()
            ) === param.fqnOrLiteralTypeText
          ) {
            logger.debug(
              ` ↳ Resolved parameter ${param.name} to dependency ${dep.text}.${signature.getName()}`
            );
            return `this.${getPropertyNameForDependency(
              module,
              dep
            )}.${signature.getName()}()`;
          }
        }
      }

      throw new CodegenError(
        param.node,
        `Container \`${
          module.name
        }\` cannot be built:\n\n\tParameter \`${param.name}\` of \`${classOrFactoryName}\` cannot be resolved.`
      );
    });

    lines.push(
      `const result = ${isClass ? 'new ' : ''}${classOrFactoryName}(${resolvedCtorParams.join(', ')});`
    );

    if (binding.bindType === 'reusable') {
      lines.push(
        `this.${getPropertyNameForReusableBinding(binding)} = result;`
      );
    }

    lines.push(`return result;`);

    return lines.join('\n');
  };
