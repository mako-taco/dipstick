import { dip } from "dipstick";
import { Foo, FooDep, IFoo } from "./Foo";
import { BarDep } from "./Bar";
import { Baz, FooBaz } from "./Baz";

export type MainModule = dip.Module<{
  dependencies: [FooDependencyModule, BarDependencyModule];
  bindings: {
    reusableIfoo: dip.Bind.Reusable<Foo, IFoo>;
    transientFoo: dip.Bind.Transient<Foo>;
  };
}>;

export type ChildModule = dip.Module<{
  dependencies: [MainModule, BarDependencyModule]; // can only have dependencies that exist in the parent module
  bindings: {
    baz: dip.Bind.Static<Baz>;
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
