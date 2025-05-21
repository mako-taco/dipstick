export interface IFoo {
  doSomething(): void;
}

export class FooDep {
  constructor() {}
}

export class Foo implements IFoo {
  constructor(public a: FooDep) {}
  doSomething() {}
}
