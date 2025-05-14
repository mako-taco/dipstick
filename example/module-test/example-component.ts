import { Component, Reusable, Transient } from "dipstick";
import { ExampleModule } from "./example-module";
import { ExampleModule2 } from "./example-module-2";
import { IFoo } from "./Foo";
import { FooDep } from "./Foo";
import { IBar } from "./Bar";

export interface ExampleComponent
  extends Component<[ExampleModule, ExampleModule2]> {
  getFoo(): Reusable<IFoo>;
  getNewFoo(): Transient<IFoo>;
  getFooDep(): Reusable<FooDep>;
  getBar(): IBar;
}
