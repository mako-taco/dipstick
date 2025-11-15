// This file has no exports

class InternalClass {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}

const internalConstant = 'internal';

function internalFunction(): void {
  console.log('This is internal');
}

// These are all internal and not exported
