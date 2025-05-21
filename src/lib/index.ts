export namespace dip {
  type GetProvided<Structure extends ModuleStructure<Module[], Module>> =
    Structure["provided"];
  type GetBindings<Structure extends ModuleStructure<Module[], Module>> =
    Structure["bindings"];
  type GetDependencies<Structure extends ModuleStructure<Module[], Module>> =
    Structure["dependencies"] extends unknown[]
      ? Structure["dependencies"]
      : never;
  type GetAllMethods<Structure extends ModuleStructure<Module[], Module>> =
    GetProvided<Structure> & GetBindings<Structure>;

  /**
   * Modules allow for the binding of implementations to the types that are used throughout
   * a project. In order to create a new module through code generation, alias a type to
   * `Module` and export it.
   *
   * The type argument you pass to `Module` lets you customize the generated code's behavior.
   * For more information, see {@link ModuleStructure}.
   *
   * Additionally, the type itself contains all of the public methods that the generated code
   * will contain. The generated code implements the type used to generate it.
   *
   * ```ts
   * // This will be picked up by the code generator.
   * export type MyModule = dip.Module<{ ... }>
   * ```
   */
  export type Module<
    Structure extends ModuleStructure<any[], any> = ModuleStructure<any[], any>
  > = {
    [K in keyof GetAllMethods<Structure>]: GetAllMethods<Structure>[K];
  };

  /**
   * Used to customize a generated modules behavior.
   *
   * @param Dependencies - The modules that the generated module depends on. These manifest
   *   as an constructor arguments to the generated module, and are used to resolve
   *   dependencies that the module cannot resolve itself.
   *
   * @param Parent - The module that will be used as the parent of the generated module. This
   *   is used to resolve dependencies that the neither the module itself nor its dependencies
   *   can resolve.
   *
   * @param Provided - Dependencies which are provided to the module at the time of construction.
   *   This is primarily used when creating a module to use as a "scope" in your application,
   *   such as a "request scope" that resolved dependencies during the lifespan of an HTTP
   *   request. All "provided" dependencies are required parameters to the constructor of the
   *   generated module.
   *
   * @param Bindings - Bindings of implementations to types that this module can provide.
   *   Bindings manifest as methods on the generated module which create a value, and
   *   return it as a specific type. See {@link Bind} for more information.
   */
  export type ModuleStructure<
    Dependencies extends Module[],
    Parent extends Module,
    Provided extends Record<string, unknown> = {},
    Bindings extends Record<
      string,
      Bind.Reusable<unknown> | Bind.Transient<unknown>
    > = {}
  > = {
    parent?: Parent;
    dependencies?: Dependencies;
    provided?: Provided;
    bindings?: Bindings;
  };

  /**
   * Used to customize the behavior of bindings on a generated module. Bindings manifest as
   * methods on generated modules which instantiate a class of type `T`, and return it,
   * optionally, as type `B`. The various `Bind` types are used to customize the behavior of
   * the binding. See {@link Bind.Reusable}, {@link Bind.Transient}, and {@link Bind.Module}
   * for more information.
   */
  export namespace Bind {
    /**
     * A binding that returns the same instance of `T` every time it is called. This is used
     * for singletons, or other objects that should only be created once per module.
     */
    export type Reusable<T extends B, B = T> = () => B;

    /**
     * A binding that returns a new instance of `T` every time it is called. This is used for
     * objects that should be created fresh each time they are requested.
     */
    export type Transient<T extends B, B = T> = () => B;

    /**
     * A special binding used to create child modules. A child module will use its parent to
     * resolve a dependency if it cannot resolve it itself. The created module must declare
     * its parent to be the same type as the creating module using {@link ModuleStructure#parent}.
     *
     * Unlike other bindings, the `Module` binding requires arguments to satisfy the dependencies
     * and provided values of the child module.
     */
    export type Module<
      Parent extends dip.Module,
      Child extends dip.Module<ModuleStructure<any[], Parent>>
    > = (
      ...dependencies: [...GetDependencies<Child>, GetProvided<Child>]
    ) => Child;
  }
}
