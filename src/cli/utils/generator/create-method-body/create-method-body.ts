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
  (logger: ILogger, allContainers: Map<string, ProcessedContainer>) =>
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

    // Extract the class/function name from FQN for both typeof and regular bindings
    let classOrFactoryName: string;
    if (binding.implementedBy.usesTypeofKeyword) {
      // Extract the function name from the FQN (e.g., "/path/to/file".functionName -> functionName)
      const fqnParts = binding.implementedBy.fqn.split('.');
      const functionName = fqnParts[fqnParts.length - 1];
      classOrFactoryName = functionName;
    } else {
      // For regular class bindings, also extract the class name from FQN
      // FQN format: "/path/to/file".ClassName -> ClassName
      const fqnParts = binding.implementedBy.fqn.split('.');
      const className = fqnParts[fqnParts.length - 1];
      classOrFactoryName = className;
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
        logger.debug(`  ↳ Checking dependency ${dep.text}...`);

        // Use processed bindings from the dependency container
        const depContainer = allContainers.get(dep.text);
        if (depContainer) {
          logger.debug(
            `    ↳ Found processed container with ${depContainer.bindings.length} bindings`
          );
          for (const depBinding of depContainer.bindings) {
            logger.debug(
              `    ↳ ${dep.text}.${depBinding.name} -> ${depBinding.boundTo.fqnOrLiteralTypeText.substring(0, 60)}`
            );
            if (
              depBinding.boundTo.fqnOrLiteralTypeText ===
              param.fqnOrLiteralTypeText
            ) {
              logger.debug(
                ` ↳ Resolved parameter ${param.name} to dependency ${dep.text}.${depBinding.name}`
              );
              return `this.${getPropertyNameForDependency(
                module,
                dep
              )}.${depBinding.name}()`;
            }
          }
        } else {
          // Fallback to type-based resolution if processed container not found
          logger.debug(`    ↳ Fallback to type-based resolution`);
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
