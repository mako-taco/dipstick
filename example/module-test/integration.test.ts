import ExampleComponentImpl from "./example-component.generated";
import { ExampleModule } from "./example-module";
import { ExampleModule2 } from "./example-module-2";
import ExampleModuleImpl from "./example-module.generated";
import ExampleModule2Impl from "./example-module-2.generated";
import { ExampleComponent } from "./example-component";

describe("Integration Tests", () => {
  let component: ExampleComponent;
  let module: ExampleModule;
  let module2: ExampleModule2;

  beforeEach(() => {
    module = ExampleModuleImpl;
    module2 = ExampleModule2Impl;
    component = new ExampleComponentImpl(module, module2);
  });

  test("getFoo returns a cached instance (Reusable)", () => {
    const foo1 = component.getFoo();
    const foo2 = component.getFoo();
    expect(foo1).toBe(foo2);
    expect(foo1).toBeInstanceOf(Object); // Adjust if IFoo is a class
  });

  test("getNewFoo returns a new instance each time (Transient)", () => {
    const foo1 = component.getNewFoo();
    const foo2 = component.getNewFoo();
    expect(foo1).not.toBe(foo2);
    expect(foo1).toBeInstanceOf(Object); // Adjust if IFoo is a class
  });

  test("getFooDep returns a cached instance (Reusable)", () => {
    const fooDep1 = component.getFooDep();
    const fooDep2 = component.getFooDep();
    expect(fooDep1).toBe(fooDep2);
    expect(fooDep1).toBeInstanceOf(Object); // Adjust if FooDep is a class
  });
});
