import { SyntaxKind } from 'ts-morph';
import { ProcessedBinding, ProcessedModule } from '../../../types';

import { ErrorWithContext } from '../../../error';
import {
  getPropertyNameForDependency,
  getPropertyNameForStaticBinding,
} from '../property-names';
import { typesEqual } from '../types-equal';

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
export const createMethodBody = (
  module: ProcessedModule,
  binding: ProcessedBinding
): string => {
  const lines = [];

  if (binding.bindType === 'reusable') {
    lines.push(`if (this._${binding.name}) return this._${binding.name};`);
  }

  if (binding.bindType === 'static') {
    lines.push(`return this.${getPropertyNameForStaticBinding(binding)};`);
    return lines.join('\n');
  }

  const className = binding.implType.getName();
  const ctor = binding.implType.getConstructors()[0];
  const ctorParams = ctor?.getParameters() ?? [];

  const resolvedCtorParams = ctorParams.map(param => {
    const paramType = param.getType();

    // Resolve on this module's bindings, first
    const matchedBinding = module.bindings.find(binding =>
      typesEqual(binding.ifaceType.getType(), paramType)
    );

    if (matchedBinding) {
      return `this.${matchedBinding.name}()`;
    }

    for (const dep of module.dependencies) {
      for (const prop of dep.type.getType().getProperties()) {
        const propertyDecl = prop.getDeclarations()[0];

        const signature =
          propertyDecl.asKind(SyntaxKind.PropertySignature) ??
          propertyDecl.asKind(SyntaxKind.MethodSignature);

        if (!signature) {
          throw new ErrorWithContext(
            dep.type,
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
          throw new ErrorWithContext(
            dep.type,
            `Expected a method signature with a return type for \`${
              dep.text
            }.${prop.getName()}\``
          );
        }

        if (typesEqual(paramType, methodReturnType)) {
          return `this.${getPropertyNameForDependency(
            module,
            dep
          )}.${signature.getName()}()`;
        }
      }
    }

    throw new ErrorWithContext(
      param,
      `Module \`${
        module.name
      }\` cannot be built, because there is no matching binding or dependency to resolve param \`${param.getName()}\` in \`${className}\``
    );
  });

  lines.push(
    `const result = new ${className}(${resolvedCtorParams.join(', ')});`
  );

  if (binding.bindType === 'reusable') {
    lines.push(`this._${binding.name} = result;`);
  }

  lines.push(`return result;`);

  return lines.join('\n');
};
