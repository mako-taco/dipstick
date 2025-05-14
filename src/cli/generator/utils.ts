import * as path from "path";
import {
  Project,
  SourceFile,
  ClassDeclaration,
  InterfaceDeclaration,
  Node,
} from "ts-morph";
import { FoundType } from "../scanner";

export function getRelativeImportPath(from: string, to: string): string {
  const fromDir = path.dirname(from);
  const toDir = path.dirname(to);
  const relativePath = path.relative(fromDir, toDir);
  const fileName = path.basename(to, path.extname(to));
  if (relativePath === "") {
    return `./${fileName}`;
  }
  return `${relativePath}/${fileName}`.replace(/\\/g, "/");
}

export function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function checkForCircularDependencies(modules: any[]): void {
  const graph: Record<string, string[]> = {};
  for (const mod of modules) {
    graph[mod.interfaceName] = mod.dependencies;
  }
  const visited = new Set<string>();
  const stack = new Set<string>();
  function visit(node: string, path: string[]): boolean {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      throw new Error(
        `Circular module dependency detected: ${cycle.join(" -> ")}`
      );
    }
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const dep of graph[node] || []) {
      visit(dep, path.concat(dep));
    }
    stack.delete(node);
    return false;
  }
  for (const mod of modules) {
    visit(mod.interfaceName, [mod.interfaceName]);
  }
}

export function findClassDeclaration(
  project: Project,
  sourceFile: SourceFile,
  typeName: string
): ClassDeclaration | undefined {
  const classDecl = sourceFile.getClass(typeName);
  if (classDecl) return classDecl;
  const imports = sourceFile.getImportDeclarations();
  for (const imp of imports) {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.startsWith(".")) {
      const importedFile = project.addSourceFileAtPath(
        path.resolve(
          path.dirname(sourceFile.getFilePath()),
          moduleSpecifier + ".ts"
        )
      );
      const importedClass = importedFile.getClass(typeName);
      if (importedClass) return importedClass;
    }
  }
  return undefined;
}

export function resolveConstructorArgs(
  project: Project,
  sourceFile: SourceFile,
  deps: string[],
  found: FoundType[],
  typeName: string,
  componentIface?: InterfaceDeclaration
): string[] {
  const ctorArgs: string[] = [];
  const classDecl = findClassDeclaration(project, sourceFile, typeName);
  if (classDecl) {
    const ctor = classDecl.getConstructors()[0];
    if (ctor) {
      for (const param of ctor.getParameters()) {
        const paramType = param.getType();
        const paramTypeName =
          paramType.getText().split(".").pop() || paramType.getText();
        let foundComponentMethod = false;
        if (componentIface) {
          for (const method of componentIface.getMethods()) {
            const returnType = method.getReturnType().getText();
            let actualType = returnType;
            if (returnType.startsWith("Reusable<")) {
              actualType =
                returnType.match(/Reusable<([^>]+)>/)?.[1] || actualType;
            } else if (returnType.startsWith("Transient<")) {
              actualType =
                returnType.match(/Transient<([^>]+)>/)?.[1] || actualType;
            }
            const actualTypeName = actualType.split(".").pop() || actualType;
            if (actualTypeName === paramTypeName) {
              ctorArgs.push(`this.${method.getName()}()`);
              foundComponentMethod = true;
              break;
            }
          }
        }
        if (foundComponentMethod) continue;
        let foundModule = false;
        for (const dep of deps) {
          const depItem = found.find(
            (f) => f.interfaceName === dep && f.kind === "module"
          );
          if (depItem) {
            const moduleSourceFile = project.addSourceFileAtPath(
              depItem.filePath
            );
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
                    if (producedTypeName === paramTypeName) {
                      const ctorType = typeArgs[0].getText();
                      if (ctorType.startsWith("typeof ")) {
                        const className = ctorType.replace(/^typeof\s+/, "");
                        const nestedArgs = resolveConstructorArgs(
                          project,
                          sourceFile,
                          deps,
                          found,
                          className,
                          componentIface
                        );
                        ctorArgs.push(
                          `this.${uncapitalize(
                            dep
                          )}.${prop.getName()}(${nestedArgs.join(", ")})`
                        );
                      } else {
                        ctorArgs.push(
                          `this.${uncapitalize(dep)}.${prop.getName()}()`
                        );
                      }
                      foundModule = true;
                      break;
                    }
                  }
                }
              }
            }
          }
          if (foundModule) break;
        }
        if (!foundModule) {
          throw new Error(
            `No module found that can create type ${paramTypeName} for constructor parameter ${param.getName()}`
          );
        }
      }
    }
  }
  return ctorArgs;
}
