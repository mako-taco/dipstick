import { Project, SourceFile } from "ts-morph";
import { generateFile } from "./generateFile";
import { FoundModule } from "../scanner";
import { ILogger } from "../logger";

describe("generateFile", () => {
  let project: Project;
  let mockLogger: ILogger;
  let sourceFile: SourceFile;

  beforeEach(() => {
    project = new Project();
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      errorWithContext: jest.fn(),
    };

    // Create a source file with a module definition
    sourceFile = project.createSourceFile(
      "test-module.ts",
      `
      import { dip } from "dipstick";

      export interface IFoo {
        doSomething(): void;
      }

      export class Foo implements IFoo {
        constructor() {}
        doSomething() {}
      }

      exportclass Bar {
        constructor() {}
      }

      export type TestModule = dip.Module<{
        dependencies: [Dependency1, Dependency2];
        bindings: {
          reusableBinding: dip.Bind.Reusable<Foo, IFoo>;
          transientBinding: dip.Bind.Transient<Foo>;
          moduleBinding: dip.Bind.Module<TestModule, ChildModule>;
        };
      }>;

      export type ChildModule = dip.Module<{
        parent: TestModule;
        dependencies: [Dependency3];
        provided: {
          providedValue: string;
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

      export type Dependency3 = dip.Module<{
        bindings: {
          dep3: dip.Bind.Reusable<Foo>;
        };
      }>;
    `
    );
  });

  describe("generateFile", () => {
    let text: string;
    beforeEach(() => {
      const modules: FoundModule[] = [
        {
          name: "TestModule",
          typeAlias: sourceFile.getTypeAlias("TestModule")!,
          filePath: "./test-module",
        },
      ];

      const generatedFile = generateFile({
        project,
        modules,
        logger: mockLogger,
        path: "./test-module.generated.ts",
        sourceFile,
      });

      text = generatedFile.getFullText();
    });
    it("should import {dip} from dipstick", () => {
      expect(text).toContain('import { dip } from "dipstick";');
    });

    it("should import the dependencies from the source file", () => {
      expect(text).toContain(
        'import { IFoo, Foo, TestModule, ChildModule, Dependency1, Dependency2, Dependency3 } from "./test-module";'
      );
    });

    it("should generate the TestModule_Impl class that implements the provided Module", () => {
      expect(text).toContain(
        "export class TestModule_Impl implements TestModule"
      );
    });

    it("should have a constructor that takes the dependencies as parameters", () => {
      expect(text).toContain(
        `constructor(private readonly dependency1: Dependency1, private readonly dependency2: Dependency2`
      );
    });

    it("should have a private, read/write field for each reusable binding", () => {
      expect(text).toContain("private _reusableBinding: IFoo;");
    });

    it("should genearte zero argument binding methods", () => {
      expect(text).toContain("reusableBinding(): IFoo");
      expect(text).toContain("transientBinding(): Foo");
    });

    it("should generate children binding methods which take the child's provided bindings as parameters", () => {
      expect(text).toContain(
        "moduleBinding(providedValue: string): ChildModule"
      );
    });
  });

  it("should generate child module implementation", () => {
    const modules: FoundModule[] = [
      {
        name: "ChildModule",
        typeAlias: sourceFile.getTypeAlias("ChildModule")!,
        filePath: "./test-module",
      },
    ];

    const generatedFile = generateFile({
      project,
      modules,
      logger: mockLogger,
      path: "generated/ChildModule.ts",
      sourceFile,
    });

    const text = generatedFile.getFullText();
    expect(text).toContain(
      "export class ChildModule_Impl implements ChildModule"
    );
    expect(text).toContain(
      "constructor(private readonly parent: TestModule, private readonly dependency3: Dependency3, private readonly providedValue: string)"
    );
  });

  it("should generate dependency module implementations", () => {
    const modules: FoundModule[] = [
      {
        name: "Dependency1",
        typeAlias: sourceFile.getTypeAlias("Dependency1")!,
        filePath: "./test-module",
      },
      {
        name: "Dependency2",
        typeAlias: sourceFile.getTypeAlias("Dependency2")!,
        filePath: "./test-module",
      },
    ];

    const generatedFile = generateFile({
      project,
      modules,
      logger: mockLogger,
      path: "generated/Dependencies.ts",
      sourceFile,
    });

    const text = generatedFile.getFullText();
    expect(text).toContain(
      "export class Dependency1_Impl implements Dependency1"
    );
    expect(text).toContain(
      "export class Dependency2_Impl implements Dependency2"
    );
    expect(text).toContain("dep1(): Foo");
    expect(text).toContain("dep2(): Bar");
  });

  it("should handle malformed module declaration", () => {
    const malformedFile = project.createSourceFile(
      "malformed.ts",
      `
      import { dip } from "dipstick";
      export type MalformedModule = dip.Module<{
        bindings: {
          invalid: any;
        };
      }>;
    `
    );

    const modules: FoundModule[] = [
      {
        name: "MalformedModule",
        typeAlias: malformedFile.getTypeAlias("MalformedModule")!,
        filePath: "./malformed",
      },
    ];

    expect(() =>
      generateFile({
        project,
        modules,
        logger: mockLogger,
        path: "generated/MalformedModule.ts",
        sourceFile,
      })
    ).toThrow("Malformed module declaration");

    expect(mockLogger.errorWithContext).toHaveBeenCalled();
  });
});
