import { Module, Bind } from "../../src/lib/index";
import { Bar, BarDep, IBar } from "./Bar";

export interface ExampleModule2 extends Module {
  bar: Bind<typeof Bar, IBar>;
  barDep: Bind<typeof BarDep, BarDep>;
}
