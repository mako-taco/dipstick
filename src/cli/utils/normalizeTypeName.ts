import * as path from 'path';
import { SourceFile } from 'ts-morph';

/**
 * Normalizes type names to ensure consistent comparison between different ways
 * of extracting type information from TypeScript AST nodes.
 *
 * This handles cases where the same type might be represented as:
 * - import("/path/to/module").TypeName → "/relative/path/to/module".TypeName
 * - "/absolute/path/to/module".TypeName → "/relative/path/to/module".TypeName
 * - TypeName → "/relative/path/to/module".TypeName (using provided source file)
 */
export function normalizeTypeName(
  typeName: string,
  sourceFile: SourceFile
): string {
  // Convert absolute path to project-relative path using ts-morph Project
  const getRelativePath = (absolutePath: string): string => {
    const project = sourceFile.getProject();
    const projectRoot = project.getFileSystem().getCurrentDirectory();
    const relativePath = path.relative(projectRoot, absolutePath);
    return '/' + relativePath.replace(/\\/g, '/'); // Normalize to forward slashes
  };

  // Convert typeof import("path").TypeName to typeof "path".TypeName
  const typeofImportMatch = typeName.match(
    /^typeof import\("([^"]+)"\)\.([A-Za-z_][A-Za-z0-9_]*)$/
  );
  if (typeofImportMatch) {
    const relativePath = getRelativePath(typeofImportMatch[1]);
    return `typeof "${relativePath}".${typeofImportMatch[2]}`;
  }

  // Convert import("path").TypeName to "path".TypeName
  const importMatch = typeName.match(
    /^import\("([^"]+)"\)\.([A-Za-z_][A-Za-z0-9_]*)$/
  );
  if (importMatch) {
    const relativePath = getRelativePath(importMatch[1]);
    return `"${relativePath}".${importMatch[2]}`;
  }

  // typeof "path".TypeName format - normalize the path
  const typeofQuotedMatch = typeName.match(
    /^typeof "([^"]+)"\.([A-Za-z_][A-Za-z0-9_]*)$/
  );
  if (typeofQuotedMatch) {
    const relativePath = getRelativePath(typeofQuotedMatch[1]);
    return `typeof "${relativePath}".${typeofQuotedMatch[2]}`;
  }

  // Already in "path".TypeName format - normalize the path
  const quotedMatch = typeName.match(/^"([^"]+)"\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (quotedMatch) {
    const relativePath = getRelativePath(quotedMatch[1]);
    return `"${relativePath}".${quotedMatch[2]}`;
  }

  // Just TypeName - add path information
  const typeNameMatch = typeName.match(/^([A-Za-z_][A-Za-z0-9_]*)$/);
  if (typeNameMatch) {
    const relativePath = getRelativePath(sourceFile.getFilePath());
    return `"${relativePath}".${typeNameMatch[1]}`;
  }

  // Return as-is if no patterns match
  return typeName;
}
