/**
 * This is an annotated example of what the generated code should look like.
 */

import { Foo, FooDep, IFoo } from "./Foo";
import { Bar, BarDep } from "./Bar";

import {
  MainModule,
  ChildModule,
  FooDependencyModule,
  BarDependencyModule,
} from "./main-module";
import { Baz, FooBaz } from "Baz";

export class MainModule_Impl implements MainModule {
  // from `Structure.bindings` @ MainModule<Structure>
  private _reusableIfoo: IFoo | undefined;

  constructor(
    // from `Structure.dependencies` @ MainModule<Structure>
    private readonly fooDependencyModule: FooDependencyModule,
    // from `Structure.dependencies` @ MainModule<Structure>
    private readonly barDependencyModule: BarDependencyModule
  ) {}

  // from `Structure.bindings` @ MainModule<Structure>
  reusableIfoo(): IFoo {
    if (!this._reusableIfoo) {
      this._reusableIfoo = new Foo(this.fooDependencyModule.fooDep());
    }
    return this._reusableIfoo;
  }

  // from `structure.bindings` @ MainModule<Structure>
  transientFoo(): Foo {
    return new Foo(this.fooDependencyModule.fooDep());
  }

  // from `structure.bindings` @ MainModule<Structure>
  childModule(
    // from `Structure.provided` @ ChildModule<Structure>
    baz: Baz
  ): ChildModule {
    return new ChildModule_Impl(this, this.barDependencyModule, baz);
  }
}

export class ChildModule_Impl implements ChildModule {
  constructor(
    // from `Structure.parent` @ ChildModule<Structure>
    private readonly parent: MainModule,
    // from `Structure.dependencies` @ ChildModule<Structure>
    private readonly barDependencyModule: BarDependencyModule,
    // from `Structure.provided` @ ChildModule<Structure>
    private readonly _baz: Baz
  ) {}

  // from `Structure.bindings` @ ChildModule<Structure>
  bar(): Bar {
    return new Bar(
      this.parent.reusableIfoo(),
      this.barDependencyModule.barDep()
    );
  }

  // from `Structure.bindings` @ ChildModule<Structure>
  fooBaz(): FooBaz {
    return new FooBaz(this._baz, this.parent.transientFoo());
  }

  // from `Structure.provided` @ ChildModule<Structure>
  baz(): Baz {
    return this._baz;
  }
}

export class FooDependencyModule_Impl implements FooDependencyModule {
  fooDep(): FooDep {
    return new FooDep();
  }
}

export class BarDependencyModule_Impl implements BarDependencyModule {
  barDep(): BarDep {
    return new BarDep();
  }
}
