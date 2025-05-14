export interface Module<ModuleDependencies extends Module[] = []> {}
export interface Component<ModuleDependencies extends Module[] = []> {}
export interface Injectable {}

type Constructor<Implementation, Dependencies extends unknown[] = []> = {
  new (...args: Dependencies): Implementation;
};
export type Bind<
  Ctor extends Constructor<Binding, any[]>,
  Binding = InstanceType<Ctor>
> = Ctor extends Constructor<Binding, infer Dependencies>
  ? (...deps: Dependencies) => Binding
  : never;
export type Reusable<Implementation> = Implementation;
export type Transient<Implementation> = Implementation;
