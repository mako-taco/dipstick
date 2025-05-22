import { Type, TypeNode, Symbol as TsMorphSymbol, SyntaxKind } from "ts-morph";

/**
 * Attempts to call a method to resolve a type.
 * 1. if any `provided` values match the necessary types, use them (this.providedName())
 * 2. if any `bindings` match the necessary types, use them (this.bindingName())
 * 3. if any of the `dependencies` modules can resolve the type, use it
 * 4. finally, use the parent to resolve the type (this.parent.bindingName())
 * @returns a string of code that can be used to resolve the type
 */
export const resolveType = ({
  type,
  bindings,
  provided,
  parent,
  dependencies,
}: {
  type: Type;
  bindings: TsMorphSymbol[];
  provided: TsMorphSymbol[];
  parent?: Type;
  dependencies: TypeNode[];
}): string => {
  for (const p of provided) {
    const providedType = p.getValueDeclarationOrThrow().getType();
    if (isEqual(type, providedType)) {
      return `this.${p.getName()}()`;
    }
  }

  for (const b of bindings) {
    const bindingType = b.getValueDeclarationOrThrow().getType();
    const [implType, interfaceType] = bindingType.getAliasTypeArguments();
    const type = interfaceType ?? implType;

    if (isEqual(type, bindingType)) {
      return `this.${b.getName()}()`;
    }
  }

  for (const d of dependencies) {
    const dependencyType = d.getType();
    debugger;
  }
  return "OH NO";
};

const isEqual = (type1: Type, type2: Type) => {
  return type1.isAssignableTo(type2) && type2.isAssignableTo(type1);
};
