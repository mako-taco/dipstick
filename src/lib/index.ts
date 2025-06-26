export namespace dip {
  type GetBindings<Structure extends ModuleStructure<Module[], Module>> =
    Structure['bindings'];

  type BindingFn<T> = () => T;

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
    Structure extends ModuleStructure<any[], any> = ModuleStructure<any[], any>,
  > = {
    [K in keyof GetBindings<Structure>]: GetBindings<Structure>[K];
  };

  /**
   * Used to customize a generated modules behavior.
   *
   * @param Dependencies - The modules that the generated module depends on. These manifest
   *   as an constructor arguments to the generated module, and are used to resolve
   *   dependencies that the module cannot resolve itself.
   *
   * @param Bindings - Bindings of implementations to types that this module can provide.
   *   Bindings manifest as methods on the generated module which create a value, and
   *   return it as a specific type. See {@link Bind} for more information.
   */
  export type ModuleStructure<
    Dependencies extends Module[],
    Bindings extends Record<
      string,
      Bind.Reusable<unknown> | Bind.Transient<unknown> | Bind.Static<unknown>
    > = {},
  > = {
    dependencies?: Dependencies;
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
    export type Reusable<T extends B, B = T> = {
      __reusable?: never;
    } & BindingFn<B>;

    /**
     * A binding that returns a new instance of `T` every time it is called. This is used for
     * objects that should be created fresh each time they are requested.
     */
    export type Transient<T extends B, B = T> = {
      __transient?: never;
    } & BindingFn<B>;

    /**
     * A binding that returns the same instance of `T` every time it is called. This is used
     * for singletons, or other objects that should only be created once per module. The instance
     * of `T` is provided to the module as a constructor argument.
     */
    export type Static<T extends B, B = T> = {
      __static?: never;
    } & BindingFn<B>;
  }
}
