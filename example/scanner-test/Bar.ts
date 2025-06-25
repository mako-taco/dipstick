import { FooDep, IFoo } from "./Foo";

export interface IBar {
  doSomething(): void;
}

export class BarDep {
  constructor() {}
}

export class Bar implements IBar {
  constructor(private a: IFoo, private b: BarDep) {}
  doSomething() {}
}
