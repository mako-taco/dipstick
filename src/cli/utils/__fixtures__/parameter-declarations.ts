// Function declarations
export function regularFunction(param1: string, param2: number) {
  return param1 + param2;
}

export function functionWithoutParams() {
  return 'no params';
}

export function functionWithOptionalParams(
  required: string,
  optional?: number
) {
  return required + (optional || 0);
}

export function functionWithRestParams(first: string, ...rest: number[]) {
  return first + rest.length;
}

// Variable declarations with different initializers
export const arrowFunction = (param1: string, param2: boolean) => {
  return param1 + param2;
};

export const functionExpression = function (param1: number, param2: string) {
  return param1 + param2;
};

export const classExpression = class {
  constructor(param1: string, param2: number) {
    // constructor
  }
};

export const classExpressionWithoutConstructor = class {
  method() {}
};

// Variable without initializer
export let variableWithoutInitializer: string;

// Variable with unsupported initializer
export const objectLiteral = {
  prop: 'value',
};

// Class declarations
export class RegularClass {
  constructor(param1: string, param2: number) {
    // constructor
  }
}

export class ClassWithoutConstructor {
  method() {}
}

export class ClassWithMultipleConstructors {
  constructor(param1: string);
  constructor(param1: string, param2: number);
  constructor(param1: string, param2?: number) {
    // constructor
  }
}

// Type aliases (should throw error)
export type MyType = string | number;

// Interfaces (should throw error)
export interface MyInterface {
  prop: string;
}
