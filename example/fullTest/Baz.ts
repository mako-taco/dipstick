export class Baz {}

export class FooBaz {
  constructor(private readonly baz: Baz, private readonly foo: Foo) {}
}
