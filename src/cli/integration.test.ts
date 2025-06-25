import { Project } from "ts-morph";
import { Scanner } from "./scanner";
import { NoOpLogger } from "./logger";
import path from "path";
import { Generator } from "./generator";

describe("generator", () => {
  it("should generate files", async () => {
    const projectRoot = path.resolve(__dirname, "../../example/scanner-test");
    const project = new Project({
      tsConfigFilePath: path.join(projectRoot, "tsconfig.json"),
    });
    const scanner = new Scanner(project, NoOpLogger);
    const generator = new Generator(project, NoOpLogger);
    const thisProjectRoot = path.resolve(__dirname, "../../");
    const { main, types } = require(path.resolve(
      thisProjectRoot,
      "package.json"
    ));

    const libraryImportPath = path.resolve(thisProjectRoot, types);

    const foundModules = scanner.findModules();

    const emitFiles = await Promise.all(
      foundModules.map((module) => generator.generateFile(module).save())
    );
  });
});
