import { dip } from '../../../../../lib/index';

export interface IFace {
  hello(): string;
}

export class Impl0 implements IFace {
  hello(): string {
    return 'world_0';
  }
}

export class Impl1 implements IFace {
  hello(): string {
    return 'world_1';
  }
}

// Type with duplicate interface types - should cause error
export type DuplicateInterfaceBindings = {
  testService1: dip.Bind.Reusable<Impl0, IFace>;
  testService2: dip.Bind.Transient<Impl1, IFace>;
};
