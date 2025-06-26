import { SyntaxKind } from "ts-morph";
import {
  ProcessedBinding, ProcessedModule
} from "../../types";

import { ErrorWithContext } from "../../error";
import { getPropertyNameForDependency, getPropertyNameForStaticBinding } from "./property-names";
import { typesEqual } from "./types-equal";

export const createMethodBody = (
  module: ProcessedModule,
  binding: ProcessedBinding
): string => {
  const lines = [];

  // TODO: resolve things
  if (binding.bindType === "reusable") {
    lines.push(`if (this._${binding.name}) return this._${binding.name};`);
  }

  if (binding.bindType === "static") {
    lines.push(`return this.${getPropertyNameForStaticBinding(binding)};`);
    return lines.join("\n");
  }

  const className = binding.implType.getName();
  const ctor = binding.implType.getConstructors()[0];
  const ctorParams = ctor?.getParameters() ?? [];

  const resolvedCtorParams = ctorParams.map((param) => {
    const paramType = param.getType();

    // Resolve on this module's bindings, first
    const matchedBinding = module.bindings.find((binding) =>
      typesEqual(binding.ifaceType.getType(), paramType)
    );

    if (matchedBinding) {
      return `this.${matchedBinding.name}()`;
    }

    for (const dep of module.dependencies) {
      for (const prop of dep.type.getType().getProperties()) {
        const propertyDecl = prop
          .getDeclarations()[0]
          ?.asKind(SyntaxKind.PropertySignature);

        if (!propertyDecl) {
          throw new ErrorWithContext(
            dep.type,
            `Expected a property signature for ${prop.getName()}`
          );
        }

        const methodReturnType = propertyDecl
          .getType()
          .getCallSignatures()[0]
          ?.getReturnType();

        if (typesEqual(paramType, methodReturnType)) {
          return `this.${getPropertyNameForDependency(
            module,
            dep
          )}.${propertyDecl.getName()}()`;
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
    `const result = new ${className}(${resolvedCtorParams.join(", ")});`
  );

  if (binding.bindType === "reusable") {
    lines.push(`this._${binding.name} = result;`);
  }

  lines.push(`return result;`);

  return lines.join("\n");
};

