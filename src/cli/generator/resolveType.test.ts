import {
  Project,
  Type,
  TypeNode,
  Symbol as TsMorphSymbol,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import { resolveType } from "./resolveType";

describe("resolveType", () => {
  let project: Project;
  let sourceFile: SourceFile;
  let typeToResolve: Type;
  let bindings: TsMorphSymbol[];
  let provided: TsMorphSymbol[];
  let parent: Type;
  let dependencies: TypeNode[];

  beforeEach(() => {
    project = new Project();
    sourceFile = project.createSourceFile(
      "test.ts",
      `
      import { dip } from "dipstick";

      export interface IFoo {
        doSomething(): void;
      }

      export class Foo implements IFoo {
        doSomething() {}
      }

      export class Bar {
        doSomethingElse() {}
      }

      export type TestModule = dip.Module<{
        dependencies: [Dependency1, Dependency2];
        bindings: {
          fooBinding: dip.Bind.Reusable<Foo, IFoo>;
          barBinding: dip.Bind.Transient<Bar>;
        };
        provided: {
          providedFoo: Foo;
          providedBar: Bar;
        };
      }>;

      export type Dependency1 = dip.Module<{
        bindings: {
          dep1: dip.Bind.Reusable<Foo>;
        };
      }>;

      export type Dependency2 = dip.Module<{
        bindings: {
          dep2: dip.Bind.Reusable<Bar>;
        };
      }>;
    `
    );

    // Get the type to resolve (Foo)
    typeToResolve = sourceFile.getClass("Foo")!.getType();

    // Get bindings
    const moduleType = sourceFile.getTypeAlias("TestModule")!;
    const moduleTypeNode = moduleType.getTypeNode()!;
    const typeArgs = moduleTypeNode
      .asKindOrThrow(SyntaxKind.TypeReference)
      .getTypeArguments();
    const structureType = typeArgs[0]!;
    const bindingsNode = structureType
      .asKindOrThrow(SyntaxKind.TypeLiteral)
      .getPropertyOrThrow("bindings")
      .getType()
      .getProperties();

    bindings = bindingsNode.map((p) => p.getSymbol()!);

    // Get provided values
    const providedNode = moduleTypeNode
      .getType()
      .getProperties()
      .find((p) => p.getName() === "provided")!
      .getValueDeclarationOrThrow()
      .getType()
      .getProperties();

    provided = providedNode.map((p) => p.getSymbol()!);

    // Get dependencies
    const dependenciesNode = moduleTypeNode
      .getType()
      .getProperties()
      .find((p) => p.getName() === "dependencies")!
      .getValueDeclarationOrThrow()
      .getType()
      .getArrayElementType()!
      .getProperties();

    dependencies = dependenciesNode.map((p) => p.getValueDeclarationOrThrow());
  });

  it("should resolve type from provided values", () => {
    const result = resolveType({
      type: typeToResolve,
      bindings,
      provided,
      dependencies,
    });

    expect(result).toBe("this.providedFoo()");
  });

  it("should resolve type from bindings if not found in provided", () => {
    // Create a new type that doesn't match provided but matches binding
    const barType = sourceFile.getClass("Bar")!.getType();

    const result = resolveType({
      type: barType,
      bindings,
      provided,
      dependencies,
    });

    expect(result).toBe("this.barBinding()");
  });

  it("should resolve type from dependencies if not found in provided or bindings", () => {
    // Create a new type that doesn't match provided or bindings
    const newType = project
      .createSourceFile(
        "new-type.ts",
        `
      export class NewType {
        doSomething() {}
      }
    `
      )
      .getClass("NewType")!
      .getType();

    const result = resolveType({
      type: newType,
      bindings,
      provided,
      dependencies,
    });

    expect(result).toBe("OH NO"); // Currently not implemented
  });

  it("should handle empty provided and bindings arrays", () => {
    const result = resolveType({
      type: typeToResolve,
      bindings: [],
      provided: [],
      dependencies,
    });

    expect(result).toBe("OH NO"); // Currently not implemented
  });

  it("should handle type equality check correctly", () => {
    const result = resolveType({
      type: typeToResolve,
      bindings: [],
      provided: [provided[0]], // providedFoo
      dependencies: [],
    });

    expect(result).toBe("this.providedFoo()");
  });

  it("should handle type inequality correctly", () => {
    const barType = sourceFile.getClass("Bar")!.getType();

    const result = resolveType({
      type: barType,
      bindings: [],
      provided: [provided[0]], // providedFoo
      dependencies: [],
    });

    expect(result).toBe("OH NO");
  });
});
