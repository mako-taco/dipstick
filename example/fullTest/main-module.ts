import { dip } from "dipstick";
import { Foo, FooDep, IFoo } from "./Foo";
import { Bar, BarDep } from "./Bar";
import { Baz, FooBaz } from "Baz";

export type MainModule = dip.Module<{
  dependencies: [FooDependencyModule, BarDependencyModule];
  bindings: {
    reusableIfoo: dip.Bind.Reusable<Foo, IFoo>;
    transientFoo: dip.Bind.Transient<Foo>;
    childModule: dip.Bind.Module<MainModule, ChildModule>;
  };
}>;

export type ChildModule = dip.Module<{
  parent: MainModule;
  dependencies: [BarDependencyModule]; // can only have dependencies that exist in the parent module
  provided: {
    baz: dip.Bind.Transient<Baz>;
  };
  bindings: {
    fooBaz: dip.Bind.Transient<FooBaz>;
  };
}>;

export type FooDependencyModule = dip.Module<{
  bindings: {
    fooDep: dip.Bind.Reusable<FooDep>;
  };
}>;

export type BarDependencyModule = dip.Module<{
  bindings: {
    barDep: dip.Bind.Reusable<BarDep>;
  };
}>;
