import {
  ClassDeclaration,
  InterfaceDeclaration,
  TupleTypeNode,
  Type,
  TypeAliasDeclaration,
  TypeLiteralNode,
} from "ts-morph";

export interface FoundModule {
  name: string;
  filePath: string;
  dependencies?: TupleTypeNode;
  bindings?: TypeLiteralNode;
}

export type ProcessedBinding = {
  name: string;
  bindType: "reusable" | "transient" | "static";
  implType: ClassDeclaration;
  ifaceType: InterfaceDeclaration | ClassDeclaration | TypeAliasDeclaration;
  pos: [number, number];
};

export type ProcessedDependency = {
  text: string;
  type: InterfaceDeclaration | TypeAliasDeclaration;
  pos: [number, number];
};

export interface ProcessedModule {
  name: string;
  dependencies: ProcessedDependency[];
  bindings: ProcessedBinding[];
}

export type ProcessedSourceFile = {
  name: string;
  filePath: string;
  dependencies?: {
    text: string;
    type: Type;
  };
  bindings: {
    name: string;
    type: Type;
  }[];
}[];

export interface ProcessedModuleGroupImport {
  namedImports: {
    name: string;
    isTypeOnly: boolean;
  }[];
  moduleSpecifier: string;
}

export interface ProcessedModuleGroup {
  filePath: string;
  sourceFilePath: string;
  imports: ProcessedModuleGroupImport[];
  modules: ProcessedModule[];
}
