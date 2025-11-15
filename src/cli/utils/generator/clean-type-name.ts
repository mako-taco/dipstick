/**
 * Extracts a clean type name from TypeScript type text that may contain inline import expressions.
 * Only cleans types from known safe modules to avoid import resolution issues.
 *
 * Examples:
 * - import("/project/path/module").TypeName → TypeName (for project files)
 * - import("/known/module").TypeName → TypeName (for well-known modules)
 * - Complex generic types are left as-is to preserve import information
 */
export function cleanTypeName(typeText: string): string {
  // For simple, single import expressions from project files, clean them
  const simpleImportMatch = typeText.match(/^import\("([^"]+)"\)\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (simpleImportMatch) {
    const path = simpleImportMatch[1];
    const typeName = simpleImportMatch[2];

    // Only clean project files (not node_modules) and simple types
    if (!path.includes('node_modules') || isWellKnownModule(path)) {
      return typeName;
    }
  }

  // For simple quoted path expressions from project files
  const simpleQuotedMatch = typeText.match(/^"([^"]+)"\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (simpleQuotedMatch) {
    const path = simpleQuotedMatch[1];
    const typeName = simpleQuotedMatch[2];

    // Only clean project files (not node_modules)
    if (!path.includes('node_modules')) {
      return typeName;
    }
  }

  // For complex types or node_modules types, leave as-is to preserve import info
  return typeText;
}

/**
 * Check if this is a well-known module where we can safely clean the types
 */
function isWellKnownModule(path: string): boolean {
  const wellKnownModules = [
    'sqlite3',
    '/sqlite3/',
    'express',
    '/express/'
  ];

  return wellKnownModules.some(module => path.includes(module));
}
