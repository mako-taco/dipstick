import {
  ClassDeclaration,
  FunctionDeclaration,
  ImportDeclaration,
  InterfaceDeclaration,
  Node,
  ParameterDeclaration,
  TupleTypeNode,
  Type,
  TypeAliasDeclaration,
  TypeLiteralNode,
  TypeNode,
} from 'ts-morph';

export interface FoundContainer {
  name: string;
  filePath: string;
  dependencies?: TupleTypeNode;
  bindings?: TypeLiteralNode;
}

export type ProcessedBindingBase = {
  name: string;
  boundTo: {
    node: TypeNode;
    typeText: string;
    usesTypeofKeyword: boolean;
    fqnOrLiteralTypeText: string;
  };
};

export type StaticBinding = ProcessedBindingBase & {
  bindType: 'static';
  boundTo: {
    usesTypeofKeyword: false;
  };
};

export type NonStaticBinding = ProcessedBindingBase & {
  bindType: 'reusable' | 'transient';
  implementedBy: {
    node: TypeNode;
    typeText: string;
    usesTypeofKeyword: boolean;
    isClass: boolean;
    parameters: {
      name: string;
      node: Node;
      usesTypeofKeyword: boolean;
      fqnOrLiteralTypeText: string;
    }[];
    fqn: string;
  };
};

export type Binding = StaticBinding | NonStaticBinding;

export type ProcessedDependency = {
  text: string;
  type: Type;
};

export interface ProcessedContainer {
  name: string;
  dependencies: ProcessedDependency[];
  bindings: Binding[];
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

export interface ProcessedContainerGroupImport {
  namedImports: {
    name: string;
    isTypeOnly: boolean;
  }[];
  moduleSpecifier: string;
}

export interface ProcessedContainerGroup {
  filePath: string;
  sourceFilePath: string;
  imports: ProcessedContainerGroupImport[];
  modules: ProcessedContainer[];
}
