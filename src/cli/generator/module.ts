import * as fs from "fs";
import { Node } from "ts-morph";
import {
  getRelativeImportPath,
  uncapitalize,
  findClassDeclaration,
} from "./utils";

export function generateModuleImplementation({
  item,
  iface,
  project,
  sourceFile,
  generatedFilePath,
  verbose,
  found,
}: any) {
  const imports = new Set<string>();
  // Always import the interface for the module
  const moduleImportPath = getRelativeImportPath(
    generatedFilePath,
    item.filePath
  );
  imports.add(`import { ${item.interfaceName} } from '${moduleImportPath}';`);
  const properties = iface.getProperties();
  const className = `${item.interfaceName}Impl`;
  const lines: string[] = [];
  lines.push(`class ${className} implements ${item.interfaceName} {`);
  for (const prop of properties) {
    const propType = prop.getTypeNode();
    if (
      propType &&
      Node.isTypeReference(propType) &&
      propType.getTypeName().getText() === "Bind"
    ) {
      const typeArgs = propType.getTypeArguments();
      if (typeArgs.length > 0) {
        let ctorType = typeArgs[0].getText();
        if (ctorType.startsWith("typeof ")) {
          ctorType = ctorType.replace(/^typeof\s+/, "");
        }
        const classDecl = findClassDeclaration(project, sourceFile, ctorType);
        let params = "";
        let paramNames: string[] = [];
        if (classDecl) {
          const ctor = classDecl.getConstructors()[0];
          if (ctor) {
            paramNames = ctor.getParameters().map((p: any) => p.getName());
            params = ctor
              .getParameters()
              .map(
                (p: any) =>
                  `${p.getName()}: ${p.getTypeNode()?.getText() ?? "any"}`
              )
              .join(", ");
            // Add imports for constructor parameters
            for (const param of ctor.getParameters()) {
              const paramType = param.getType();
              const paramTypeSymbol = paramType.getSymbol();
              if (paramTypeSymbol) {
                const paramTypeDecl = paramTypeSymbol.getDeclarations()[0];
                if (paramTypeDecl) {
                  const paramSourceFile = paramTypeDecl.getSourceFile();
                  if (paramSourceFile) {
                    const paramTypeName = paramType.getText();
                    const importPath = getRelativeImportPath(
                      generatedFilePath,
                      paramSourceFile.getFilePath()
                    );
                    const typeName =
                      paramTypeName.split(".").pop() || paramTypeName;
                    imports.add(`import { ${typeName} } from '${importPath}';`);
                  }
                }
              }
            }
          }
        }
        // Add import for the class being instantiated
        if (classDecl) {
          const classSourceFile = classDecl.getSourceFile();
          if (classSourceFile) {
            const importPath = getRelativeImportPath(
              generatedFilePath,
              classSourceFile.getFilePath()
            );
            imports.add(
              `import { ${classDecl.getName()} } from '${importPath}';`
            );
          }
        }
        lines.push(
          `  ${prop.getName()} = (${params}) => {\n    return new ${ctorType}(${paramNames.join(
            ", "
          )});\n  };`
        );
      } else {
        lines.push(
          `  ${prop.getName()} = () => {\n    throw new Error('Not implemented');\n  };`
        );
      }
    } else {
      lines.push(
        `  ${prop.getName()} = () => {\n    throw new Error('Not implemented');\n  };`
      );
    }
  }
  lines.push("}");
  lines.push("");
  lines.push(`export default new ${className}();`);
  const finalLines = [...Array.from(imports), ...lines];
  fs.writeFileSync(generatedFilePath, finalLines.join("\n"));
}
