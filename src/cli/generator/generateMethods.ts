import {
  Scope,
  MethodDeclarationStructure,
  OptionalKind,
  Symbol as TsMorphSymbol,
  PropertyDeclarationStructure,
  Type,
  TypeNode,
} from "ts-morph";
import { getClassInstantiationText } from "./getClassInstantiationText";

export function generateMethods({
  bindings,
  provided,
  parent,
  dependencies,
}: {
  bindings: TsMorphSymbol[];
  provided: TsMorphSymbol[];
  parent?: Type;
  dependencies: TypeNode[];
}): {
  methods: OptionalKind<MethodDeclarationStructure>[];
  properties: OptionalKind<PropertyDeclarationStructure>[];
} {
  const methods: OptionalKind<MethodDeclarationStructure>[] = [];
  const properties: OptionalKind<PropertyDeclarationStructure>[] = [];

  for (const dep of provided) {
    const name = dep.getName();
    const type = dep.getValueDeclarationOrThrow().getType();
    const typeString = type.getText();

    methods.push({
      name,
      returnType: typeString,
      statements: [`return this._${name};`],
    });
  }

  for (const binding of bindings) {
    const name = binding.getName();
    const type = binding.getValueDeclarationOrThrow().getType();
    const bindingTypeArgs = type.getAliasTypeArguments();
    const bindingKind = type.getAliasSymbolOrThrow().getName();

    if (bindingKind === "Reusable") {
      const [implType, interfaceType] = bindingTypeArgs;
      const typeString = (interfaceType || implType)
        .getSymbolOrThrow()
        .getName();

      // Add private field for caching
      properties.push({
        name: `_${name}`,
        type: typeString,
        isReadonly: false,
        scope: Scope.Private,
      });

      // Add getter method
      methods.push({
        name,
        returnType: typeString,
        statements: [
          `if (!this._${name}) {`,
          `  this._${name} = ${getClassInstantiationText({
            type: implType,
            bindings,
            provided,
            parent,
            dependencies,
          })};`,
          `}`,
          `return this._${name};`,
        ],
      });
    } else if (bindingKind === "Transient") {
      const [implType, interfaceType] = bindingTypeArgs;
      const typeString = (interfaceType || implType)
        .getSymbolOrThrow()
        .getName();
      methods.push({
        name,
        returnType: typeString,
        // TODO: resolve dependencies of the constructor
        statements: [
          `return ${getClassInstantiationText({ type: implType })};`,
        ],
      });
    } else if (bindingKind === "Module") {
      const [, childType] = bindingTypeArgs;
      methods.push({
        name,
        parameters: [
          {
            name: "dependencies",
            type: "any[]",
            isRestParameter: true,
          },
        ],
        returnType: childType.getText(),
        statements: [
          `return new ${childType.getText()}_Impl(this, ...dependencies);`,
        ],
      });
    }
  }

  return { methods, properties };
}
