export interface NoImportsInterface {
  id: number;
  name: string;
}

export class NoImportsClass {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  public getValue(): string {
    return this.value;
  }
}

export const noImportsFunction = (input: string): NoImportsInterface => {
  return {
    id: 1,
    name: input,
  };
};

const localVariable = 'This file has no imports';
