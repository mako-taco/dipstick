import {
  ClassDeclaration,
  InterfaceDeclaration,
  TupleTypeNode,
  Type,
  TypeAliasDeclaration,
  TypeLiteralNode,
} from 'ts-morph';

export interface FoundContainer {
  name: string;
  filePath: string;
  dependencies?: TupleTypeNode;
  bindings?: TypeLiteralNode;
}

export type ProcessedBinding =
  | {
      name: string;
      bindType: 'reusable' | 'transient';
      impl: {
        declaration: ClassDeclaration;
        fqn: string;
      };
      iface: {
        declaration:
          | InterfaceDeclaration
          | ClassDeclaration
          | TypeAliasDeclaration;
        fqn: string;
      };
    }
  | {
      name: string;
      bindType: 'static';
      impl: {
        declaration:
          | InterfaceDeclaration
          | ClassDeclaration
          | TypeAliasDeclaration;
        fqn: string;
      };
      iface: {
        declaration:
          | InterfaceDeclaration
          | ClassDeclaration
          | TypeAliasDeclaration;
        fqn: string;
      };
    };

export type ProcessedDependency = {
  text: string;
  type: Type;
};

export interface ProcessedContainer {
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
