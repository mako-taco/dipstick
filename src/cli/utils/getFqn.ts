/**
 * Returns a fully qualified name (FQN) for a given symbol name and its file path or module specifier.
 * The FQN is formatted as: "<fileOrModulePathWithoutExtension>.<name>"
 *
 * Example:
 *   getFqn('MyClass', './src/my-file.ts') // => "./src/my-file".MyClass
 *
 * @param name - The symbol name to qualify.
 * @param pathOrModuleSpecifier - The file path or module specifier where the symbol is declared.
 * @returns The fully qualified name as a string.
 */

export const getFqn = (
  args:
    | { name: string; path: string; module?: never }
    | { name: string; module: string; path?: never }
) => {
  const { name, path, module } = args;

  const pathOrModuleSpecifier = path
    ? path.replace(/(?:\.d)?\.tsx?$/, '')
    : module;

  return `"${pathOrModuleSpecifier}".${name}`;
};
