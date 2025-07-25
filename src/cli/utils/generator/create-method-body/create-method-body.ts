import { SyntaxKind } from 'ts-morph';
import { ProcessedBinding, ProcessedContainer } from '../../../types';

import { CodegenError } from '../../../error';
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
  (module: ProcessedContainer, binding: ProcessedBinding): string => {
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

    const className = binding.impl.declaration.getName();
    const ctor = binding.impl.declaration.getConstructors()[0];
    const ctorParams = ctor?.getParameters() ?? [];

    const resolvedCtorParams = ctorParams.map(param => {
      const paramType = param.getType();
      const paramFqn = paramType.getSymbol()?.getFullyQualifiedName();
      logger.debug(`↳ Resolving parameter ${param.getName()} (${paramFqn})...`);

      // Resolve on this module's bindings, first
      const matchedBinding = module.bindings.find(
        binding => binding.iface.fqn === paramFqn
      );

      if (matchedBinding) {
        logger.debug(
          `↳ Resolved parameter ${param.getName()} to binding ${matchedBinding.name}`
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

          if (
            methodReturnType.getSymbol()?.getFullyQualifiedName() === paramFqn
          ) {
            logger.debug(
              ` ↳ Resolved parameter ${param.getName()} to dependency ${dep.text}.${signature.getName()}`
            );
            return `this.${getPropertyNameForDependency(
              module,
              dep
            )}.${signature.getName()}()`;
          }
        }
      }

      throw new CodegenError(
        param,
        `Container \`${
          module.name
        }\` cannot be built:\n\n\tParameter \`${param.getName()}\` of class \`${className}\` cannot be resolved.`
      );
    });

    lines.push(
      `const result = new ${className}(${resolvedCtorParams.join(', ')});`
    );

    if (binding.bindType === 'reusable') {
      lines.push(
        `this.${getPropertyNameForReusableBinding(binding)} = result;`
      );
    }

    lines.push(`return result;`);

    return lines.join('\n');
  };
