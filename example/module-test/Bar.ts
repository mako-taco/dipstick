import { FooDep } from "./Foo";

export interface IBar {
  doSomething(): void;
}

export class BarDep {
  constructor() {}
}

export class Bar implements IBar {
  constructor(private a: FooDep, private b: BarDep) {}
  doSomething() {}
}
