import { dip } from "dipstick";
import { Foo, FooDep, IFoo } from "./Foo";
import { Bar, BarDep } from "./Bar";

export type MainModule = dip.Module<{
  dependencies: [FooDependencyModule];
  bindings: {
    reusableIfoo: dip.Bind.Reusable<Foo, IFoo>;
    transientFoo: dip.Bind.Transient<Foo>;
    childModule: dip.Bind.Module<MainModule, ChildModule>;
  };
}>;

export type ChildModule = dip.Module<{
  parent: MainModule;
  dependencies: [BarDependencyModule];
  provided: {
    bar: dip.Bind.Reusable<Bar>;
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
