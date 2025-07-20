type GetBindings<Structure extends ContainerStructure<Container[], Container>> =
  Structure['bindings'];

/**
 * Containers allow for the binding of implementations to the types that are used throughout
 * a project. In order to create a new module through code generation, alias a type to
 * `Container` and export it.
 *
 * The type argument you pass to `Container` lets you customize the generated code's behavior.
 * For more information, see {@link ContainerStructure}.
 *
 * Additionally, the type itself contains all of the public methods that the generated code
 * will contain. The generated code implements the type used to generate it.
 *
 * ```ts
 * // This will be picked up by the code generator.
 * export type MyContainer = Container<{ ... }>
 * ```
 */
export type Container<
  Structure extends ContainerStructure<any[], any> = ContainerStructure<
    any[],
    any
  >,
> = {
  [K in keyof GetBindings<Structure>]: GetBindings<Structure>[K];
};

/**
 * Used to customize the behavior of bindings on a generated module. Bindings manifest as
 * methods on generated modules which instantiate a class of type `T`, and return it,
 * optionally, as type `B`. The various `Bind` types are used to customize the behavior of
 * the binding. See {@link Bind.Reusable}, {@link Bind.Transient}, and {@link Bind.Container}
 * for more information.
 */
type Binding<T extends B, B = T> = () => B;

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
export type ContainerStructure<
  Dependencies extends Container[],
  Bindings extends Record<
    string,
    Reusable<unknown> | Transient<unknown> | Static<unknown>
  > = {},
> = {
  dependencies?: Dependencies;
  bindings?: Bindings;
};

/**
 * A binding that returns the same instance of `T` every time it is called. This is used
 * for singletons, or other objects that should only be created once per module.
 */
export type Reusable<T extends B, B = T> = {
  __reusable?: never;
} & Binding<T, B>;

/**
 * A binding that returns a new instance of `T` every time it is called. This is used for
 * objects that should be created fresh each time they are requested.
 */
export type Transient<T extends B, B = T> = {
  __transient?: never;
} & Binding<T, B>;

/**
 * A binding that returns the same instance of `T` every time it is called. This is used
 * for singletons, or other objects that should only be created once per module. The instance
 * of `T` is provided to the module as a constructor argument.
 */
export type Static<T extends B, B = T> = {
  __static?: never;
} & Binding<T, B>;
