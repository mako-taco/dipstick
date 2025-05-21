import { dip } from "dipstick";

interface IFoo {}
class Foo implements IFoo {}

type MyModule = dip.Module<{
  bindings: {
    foo: dip.Bind.Reusable<Foo, IFoo>;
  };
}>;

// This should not be found by the scanner
type InternalModule = dip.Module<{
  bindings: {
    internal: dip.Bind.Transient<Foo>;
  };
}>;

export type AnotherModule = dip.Module<{
  bindings: {
    another: dip.Bind.Transient<Foo>;
  };
}>;
