import {
  ImportDeclarationStructure,
  MethodDeclarationStructure,
  OptionalKind,
  Project,
  PropertyDeclarationStructure,
  Scope,
  SourceFile,
  SyntaxKind,
  Type,
} from "ts-morph";
import {
  ProcessedBinding,
  ProcessedDependency,
  ProcessedModule,
  ProcessedModuleGroup,
} from "./scanner";
import { ILogger } from "./logger";
import { ErrorWithContext } from "./error";
import { match } from "assert";
import { resolveType } from "./resolve";
import { typesEqual } from "./types-equal";

const DEPENDENCY_MODULE_PROPERTY_NAME = "_options.dependencyModules";
const STATIC_BINDINGS_PROPERTY_NAME = "_options.staticBindings";

export class Generator {
  constructor(
    private readonly project: Project,
    private readonly logger: ILogger
  ) {}

  private getPropertyNameForDependency(
    module: ProcessedModule,
    dependency: ProcessedDependency
  ): string {
    const idx = module.dependencies.indexOf(dependency);
    return `${DEPENDENCY_MODULE_PROPERTY_NAME}[${idx}]`;
  }

  private getPropertyNameForStaticBinding(binding: ProcessedBinding): string {
    return `${STATIC_BINDINGS_PROPERTY_NAME}.${binding.name}`;
  }

  private getPropertyNameForCachedBinding(binding: ProcessedBinding): string {
    return `_${binding.name}`;
  }

  public generateFile(moduleGroup: ProcessedModuleGroup): SourceFile {
    const sourceFile = this.project.getSourceFileOrThrow(
      moduleGroup.sourceFilePath
    );
    const existingFile = this.project.getSourceFile(moduleGroup.filePath);
    if (existingFile) this.project.removeSourceFile(existingFile);
    const outputFile = this.project.createSourceFile(
      moduleGroup.filePath,
      undefined,
      { overwrite: true }
    );

    moduleGroup.imports.forEach((moduleGroupImport) => {
      outputFile.addImportDeclaration({
        ...moduleGroupImport,
      });
    });

    moduleGroup.modules.forEach((module) => {
      const reusableBindings = module.bindings.filter(
        (binding) => binding.bindType === "reusable"
      );

      const staticBindings = module.bindings.filter(
        (binding) => binding.bindType === "static"
      );

      const staticBindingsType = `{${staticBindings
        .map(
          (binding) =>
            `readonly ${binding.name}: ${binding.implType
              .getSymbol()
              ?.getName()}`
        )
        .join(", ")}}`;

      const dependencyModulesType = `readonly [${module.dependencies
        .map((dep) => dep.text)
        .join(", ")}]`;

      outputFile.addClass({
        name: `${module.name}Impl`,
        isExported: true,
        isAbstract: false,
        implements: [module.name],
        ctors: [
          {
            parameters: [
              {
                name: "_options",
                type: `{readonly staticBindings: ${staticBindingsType}, dependencyModules: ${dependencyModulesType}}`,
                scope: Scope.Private,
              },
            ],
          },
        ],
        properties: [
          ...reusableBindings.map(
            (binding) =>
              ({
                name: this.getPropertyNameForCachedBinding(binding),
                type: binding.implType.getSymbol()?.getName(),
                hasQuestionToken: true,
                isReadonly: false,
                scope: Scope.Private,
              } satisfies OptionalKind<PropertyDeclarationStructure>)
          ),
        ],
        methods: [
          ...module.bindings.map(
            (binding) =>
              ({
                name: `${binding.name}`,
                isStatic: false,
                isAsync: false,
                returnType: binding.ifaceType.getSymbol()?.getName(),
                parameters: [],
                statements: this.createMethodBody(module, binding),
              } satisfies OptionalKind<MethodDeclarationStructure>)
          ),
        ],
      });
    });

    outputFile
      .organizeImports()
      .fixUnusedIdentifiers()
      .formatText({ ensureNewLineAtEndOfFile: true });

    return outputFile;
  }

  private createMethodBody(
    module: ProcessedModule,
    binding: ProcessedModule["bindings"][number]
  ): string {
    const lines = [];

    // TODO: resolve things
    if (binding.bindType === "reusable") {
      lines.push(`if (this._${binding.name}) return this._${binding.name};`);
    }

    if (binding.bindType === "static") {
      lines.push(
        `return this.${this.getPropertyNameForStaticBinding(binding)};`
      );
      return lines.join("\n");
    }

    const className = binding.implType.getName();
    const ctor = binding.implType.getConstructors()[0];
    const ctorParams = ctor?.getParameters() ?? [];

    const resolvedCtorParams = ctorParams.map((param) => {
      const paramType = param.getType();

      // Resolve on this module's bindings, first
      const matchedBinding = module.bindings.find((binding) =>
        typesEqual(binding.ifaceType.getType(), paramType)
      );

      if (matchedBinding) {
        return `this.${matchedBinding.name}()`;
      }

      for (const dep of module.dependencies) {
        for (const prop of dep.type.getType().getProperties()) {
          const propertyDecl = prop
            .getDeclarations()[0]
            ?.asKind(SyntaxKind.PropertySignature);

          if (!propertyDecl) {
            throw new ErrorWithContext(
              dep.type,
              `Expected a property signature for ${prop.getName()}`
            );
          }

          const methodReturnType = propertyDecl
            .getType()
            .getCallSignatures()[0]
            ?.getReturnType();

          if (typesEqual(paramType, methodReturnType)) {
            return `this.${this.getPropertyNameForDependency(
              module,
              dep
            )}.${propertyDecl.getName()}()`;
          }
        }
      }

      throw new ErrorWithContext(
        param,
        `Module \`${
          module.name
        }\` cannot be built, because there is no matching binding or dependency to resolve param \`${param.getName()}\` in \`${className}\``
      );
    });

    lines.push(
      `const result = new ${className}(${resolvedCtorParams.join(", ")});`
    );

    if (binding.bindType === "reusable") {
      lines.push(`this._${binding.name} = result;`);
    }

    lines.push(`return result;`);

    return lines.join("\n");
  }
}
