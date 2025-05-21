import { Project } from "ts-morph";
import { Scanner } from "./scanner";
import { join } from "path";
import { NoOpLogger } from "./logger";

describe("scanForModules", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({
      tsConfigFilePath: join(
        __dirname,
        "../../example/scanForModulesTest/tsconfig.json"
      ),
    });
  });

  it("should find all exported module type aliases", () => {
    const modules = new Scanner(project, NoOpLogger).scan();

    const expectedModules = [
      "MainModule",
      "ChildModule",
      "FooDependencyModule",
      "BarDependencyModule",
      "AnotherModule",
    ].sort();
    expect(modules.map((m) => m.name).sort()).toEqual(expectedModules);
  });
});
