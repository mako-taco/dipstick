import * as fs from "fs";
import { Node } from "ts-morph";
import {
  getRelativeImportPath,
  uncapitalize,
  resolveConstructorArgs,
} from "./utils";

export function generateComponentImplementation({
  item,
  iface,
  project,
  sourceFile,
  generatedFilePath,
  verbose,
  found,
}: any) {
  const deps = item.dependencies;
  const ctorArgs = deps
    .map((dep: string) => `${uncapitalize(dep)}: ${dep}`)
    .join(", ");
  const depImports = new Set<string>();
  for (const dep of deps) {
    const depItem = found.find(
      (f: any) => f.interfaceName === dep && f.kind === "module"
    );
    let depImportPath = dep;
    if (depItem) {
      depImportPath = getRelativeImportPath(
        generatedFilePath,
        depItem.filePath
      );
    }
    depImports.add(`import { ${dep} } from '${depImportPath}';`);
  }
  let needsReusable = false;
  let needsTransient = false;
  const typeImports = new Set<string>();
  const fallbackTypeImports = new Set<string>();
  for (const method of iface.getMethods()) {
    const typeNode = method.getReturnTypeNode();
    const declaredReturnType = typeNode
      ? typeNode.getText()
      : method.getReturnType().getText();
    if (verbose) {
      console.log(
        `[debug] Method ${method.getName()} declared return type:`,
        declaredReturnType
      );
    }
    const returnType = declaredReturnType;
    let actualType = returnType;
    let foundTypeImport = false;
    if (returnType.startsWith("Reusable<")) {
      needsReusable = true;
      actualType = returnType.match(/Reusable<([^>]+)>/)?.[1] || actualType;
    } else if (returnType.startsWith("Transient<")) {
      needsTransient = true;
      actualType = returnType.match(/Transient<([^>]+)>/)?.[1] || actualType;
    }
    for (const dep of deps) {
      const depItem = found.find(
        (f: any) => f.interfaceName === dep && f.kind === "module"
      );
      if (depItem) {
        const moduleSourceFile = project.addSourceFileAtPath(depItem.filePath);
        const moduleIface = moduleSourceFile.getInterface(dep);
        if (moduleIface) {
          for (const prop of moduleIface.getProperties()) {
            const propType = prop.getTypeNode();
            if (
              propType &&
              Node.isTypeReference(propType) &&
              propType.getTypeName().getText() === "Bind"
            ) {
              const typeArgs = propType.getTypeArguments();
              if (typeArgs.length > 1) {
                let producedType = typeArgs[1].getText();
                const producedTypeName =
                  producedType.split(".").pop() || producedType;
                const actualTypeName =
                  actualType.split(".").pop() || actualType;
                if (producedTypeName === actualTypeName) {
                  const producedTypeSymbol = propType
                    .getType()
                    .getTypeArguments()[1]
                    ?.getSymbol();
                  if (producedTypeSymbol) {
                    const producedTypeDecl =
                      producedTypeSymbol.getDeclarations()[0];
                    if (producedTypeDecl) {
                      const producedTypeSourceFile =
                        producedTypeDecl.getSourceFile();
                      if (producedTypeSourceFile) {
                        const importPath = getRelativeImportPath(
                          generatedFilePath,
                          producedTypeSourceFile.getFilePath()
                        );
                        typeImports.add(
                          `import { ${producedTypeName} } from '${importPath}';`
                        );
                        foundTypeImport = true;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (!foundTypeImport) {
      const typeName = actualType.split(".").pop() || actualType;
      let importPath: string | null = null;
      const ifaceImports = sourceFile.getImportDeclarations();
      for (const imp of ifaceImports) {
        const namedImports = imp.getNamedImports();
        for (const named of namedImports) {
          if (named.getName() === typeName) {
            importPath = getRelativeImportPath(
              generatedFilePath,
              imp.getModuleSpecifierSourceFile()?.getFilePath() ||
                imp.getModuleSpecifierValue()
            );
            break;
          }
        }
        if (importPath) break;
      }
      if (!importPath) {
        importPath = getRelativeImportPath(generatedFilePath, item.filePath);
      }
      fallbackTypeImports.add(`import { ${typeName} } from '${importPath}';`);
    }
  }
  if (needsReusable) typeImports.add(`import { Reusable } from 'dipstick';`);
  if (needsTransient) typeImports.add(`import { Transient } from 'dipstick';`);
  const componentImportPath = getRelativeImportPath(
    generatedFilePath,
    item.filePath
  );
  const interfaceImport = `import { ${item.interfaceName} } from '${componentImportPath}';`;
  const finalImports = [
    interfaceImport,
    ...Array.from(depImports),
    ...Array.from(typeImports),
    ...Array.from(fallbackTypeImports),
  ];
  const imports = new Set<string>(finalImports);
  const className = `${item.interfaceName}Impl`;
  const lines: string[] = [];
  lines.push(`class ${className} implements ${item.interfaceName} {`);
  for (const dep of deps) {
    lines.push(`  public readonly ${uncapitalize(dep)}: ${dep};`);
  }
  lines.push(`  constructor(${ctorArgs}) {`);
  for (const dep of deps) {
    lines.push(`    this.${uncapitalize(dep)} = ${uncapitalize(dep)};`);
  }
  lines.push(`  }`);
  for (const method of iface.getMethods()) {
    const sig = method.getText().replace(/;$/, "");
    const typeNode = method.getReturnTypeNode();
    const declaredReturnType = typeNode
      ? typeNode.getText()
      : method.getReturnType().getText();
    if (verbose) {
      console.log(
        `[debug] Method ${method.getName()} declared return type:`,
        declaredReturnType
      );
    }
    const returnType = declaredReturnType;
    let actualType = returnType;
    let isReusable = false;
    let typeName = actualType;
    if (returnType.startsWith("Reusable<")) {
      actualType = returnType.match(/Reusable<([^>]+)>/)?.[1] || actualType;
      isReusable = true;
    } else if (returnType.startsWith("Transient<")) {
      actualType = returnType.match(/Transient<([^>]+)>/)?.[1] || actualType;
    }
    typeName = actualType.split(".").pop() || actualType;
    let moduleToUse = null;
    let modulePropertyToCall = null;
    let ctorArgs: string[] = [];
    for (const dep of deps) {
      const depItem = found.find(
        (f: any) => f.interfaceName === dep && f.kind === "module"
      );
      if (depItem) {
        const moduleSourceFile = project.addSourceFileAtPath(depItem.filePath);
        const moduleIface = moduleSourceFile.getInterface(dep);
        if (moduleIface) {
          for (const prop of moduleIface.getProperties()) {
            const propType = prop.getTypeNode();
            if (
              propType &&
              Node.isTypeReference(propType) &&
              propType.getTypeName().getText() === "Bind"
            ) {
              const typeArgs = propType.getTypeArguments();
              if (typeArgs.length > 1) {
                let producedType = typeArgs[1].getText();
                const producedTypeName =
                  producedType.split(".").pop() || producedType;
                if (producedTypeName === typeName) {
                  moduleToUse = dep;
                  modulePropertyToCall = prop.getName();
                  const ctorType = typeArgs[0].getText();
                  if (ctorType.startsWith("typeof ")) {
                    const className = ctorType.replace(/^typeof\s+/, "");
                    ctorArgs = resolveConstructorArgs(
                      project,
                      sourceFile,
                      deps,
                      found,
                      className,
                      iface
                    );
                  } else {
                    ctorArgs = [];
                  }
                  break;
                }
              }
            }
          }
        }
      }
      if (moduleToUse) break;
    }
    if (!moduleToUse || !modulePropertyToCall) {
      throw new Error(
        `No module found that can create type ${actualType} for method ${method.getName()}`
      );
    }
    lines.push(`  ${sig} {`);
    if (isReusable) {
      lines.push(`    if (!this._${method.getName()}) {`);
      lines.push(
        `      this._${method.getName()} = this.${uncapitalize(
          moduleToUse
        )}.${modulePropertyToCall}(${ctorArgs.join(", ")});`
      );
      lines.push(`    }`);
      lines.push(`    return this._${method.getName()};`);
    } else {
      lines.push(
        `    return this.${uncapitalize(
          moduleToUse
        )}.${modulePropertyToCall}(${ctorArgs.join(", ")});`
      );
    }
    lines.push(`  }`);
    if (isReusable) {
      lines.push(`  private _${method.getName()}: ${actualType} | undefined;`);
    }
  }
  lines.push("}");
  lines.push("");
  lines.push(`export default ${className};`);
  const finalLines = [...Array.from(imports), ...lines];
  fs.writeFileSync(generatedFilePath, finalLines.join("\n"));
}
