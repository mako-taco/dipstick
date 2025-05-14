import { Module, Bind } from "../../src/lib/index";
import { Foo, IFoo, FooDep } from "./Foo";

export interface ExampleModule extends Module {
  foo: Bind<typeof Foo, IFoo>;
  fooDep: Bind<typeof FooDep, FooDep>;
}
