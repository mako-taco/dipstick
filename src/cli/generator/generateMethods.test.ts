import { Project, Symbol as TsMorphSymbol } from "ts-morph";
import { generateMethods } from "./generateMethods";

describe("generateMethods", () => {
  let project: Project;
  let mockSymbol: TsMorphSymbol;

  beforeEach(() => {
    project = new Project();
    mockSymbol = {
      getName: jest.fn(),
      getDeclaredType: jest.fn(),
    } as unknown as TsMorphSymbol;
  });

  it("should generate Reusable binding methods", () => {
    const mockType = {
      getTypeArguments: jest.fn().mockReturnValue([
        {
          getTypeArguments: jest
            .fn()
            .mockReturnValue([
              { getText: () => "ImplType" },
              { getText: () => "InterfaceType" },
            ]),
        },
      ]),
      getText: () => "Reusable",
    };

    mockSymbol.getDeclaredType = jest.fn().mockReturnValue(mockType);
    mockSymbol.getName = jest.fn().mockReturnValue("testBinding");

    const result = generateMethods([mockSymbol]);

    expect(result.properties).toHaveLength(1);
    expect(result.methods).toHaveLength(1);
    expect(result.properties[0]).toEqual({
      name: "_testBinding",
      type: "InterfaceType",
      isReadonly: false,
      scope: "private",
    });
    expect(result.methods[0]).toEqual({
      name: "testBinding",
      returnType: "InterfaceType",
      statements: [
        "if (!this._testBinding) {",
        "  this._testBinding = new ImplType();",
        "}",
        "return this._testBinding;",
      ],
    });
  });

  it("should generate Transient binding methods", () => {
    const mockType = {
      getTypeArguments: jest.fn().mockReturnValue([
        {
          getTypeArguments: jest
            .fn()
            .mockReturnValue([
              { getText: () => "ImplType" },
              { getText: () => "InterfaceType" },
            ]),
        },
      ]),
      getText: () => "Transient",
    };

    mockSymbol.getDeclaredType = jest.fn().mockReturnValue(mockType);
    mockSymbol.getName = jest.fn().mockReturnValue("testBinding");

    const result = generateMethods([mockSymbol]);

    expect(result.properties).toHaveLength(0);
    expect(result.methods).toHaveLength(1);
    expect(result.methods[0]).toEqual({
      name: "testBinding",
      returnType: "InterfaceType",
      statements: ["return new ImplType();"],
    });
  });

  it("should generate Module binding methods", () => {
    const mockType = {
      getTypeArguments: jest.fn().mockReturnValue([
        {
          getTypeArguments: jest
            .fn()
            .mockReturnValue([
              { getText: () => "ParentType" },
              { getText: () => "ChildType" },
            ]),
        },
      ]),
      getText: () => "Module",
    };

    mockSymbol.getDeclaredType = jest.fn().mockReturnValue(mockType);
    mockSymbol.getName = jest.fn().mockReturnValue("testBinding");

    const result = generateMethods([mockSymbol]);

    expect(result.properties).toHaveLength(0);
    expect(result.methods).toHaveLength(1);
    expect(result.methods[0]).toEqual({
      name: "testBinding",
      parameters: [
        {
          name: "dependencies",
          type: "any[]",
        },
      ],
      returnType: "ChildType",
      statements: ["return new ChildType_Impl(this, ...dependencies);"],
    });
  });
});
