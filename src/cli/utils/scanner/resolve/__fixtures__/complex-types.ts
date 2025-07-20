// Complex types and edge cases for testing resolveType function

export interface IGenericRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T>;
}

export interface IEventEmitter<T = unknown> {
  on(event: string, handler: (data: T) => void): void;
  emit(event: string, data: T): void;
  off(event: string, handler: (data: T) => void): void;
}

export class GenericService<TModel, TKey = string> {
  constructor(private repository: IGenericRepository<TModel, TKey>) {}

  async get(id: TKey): Promise<TModel | null> {
    return this.repository.findById(id);
  }

  async getAll(): Promise<TModel[]> {
    return this.repository.findAll();
  }
}

export abstract class AbstractFactory<T> {
  abstract create(): T;
  abstract destroy(instance: T): void;
}

export class SingletonFactory<T> extends AbstractFactory<T> {
  private instance: T | null = null;

  constructor(private factory: () => T) {
    super();
  }

  create(): T {
    if (!this.instance) {
      this.instance = this.factory();
    }
    return this.instance;
  }

  destroy(instance: T): void {
    if (this.instance === instance) {
      this.instance = null;
    }
  }
}

export namespace Types {
  export interface INestedService {
    process(): void;
  }

  export class NestedImplementation implements INestedService {
    process(): void {
      console.log('Processing in nested namespace');
    }
  }

  export type NestedConfig = {
    enabled: boolean;
    options: Record<string, unknown>;
  };
}

export type ConditionalType<T> = T extends string
  ? StringProcessor
  : T extends number
    ? NumberProcessor
    : DefaultProcessor;

export type StringProcessor = {
  process(value: string): string;
};

export type NumberProcessor = {
  process(value: number): number;
};

export type DefaultProcessor = {
  process(value: unknown): unknown;
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

export interface IComplexEntity {
  id: string;
  metadata: Record<string, unknown>;
  tags: string[];
  config: {
    enabled: boolean;
    settings: {
      timeout: number;
      retries: number;
    };
  };
}

export class ComplexEntityProcessor {
  process(entity: IComplexEntity): void {
    console.log(`Processing entity ${entity.id}`);
  }

  validate(entity: DeepPartial<IComplexEntity>): boolean {
    return !!entity.id;
  }
}

// Edge case: Class with same name as interface in different scope
export namespace EdgeCases {
  export interface IProcessor {
    execute(): void;
  }
}

export interface IProcessor {
  run(): void;
}

export class Processor implements IProcessor {
  run(): void {
    console.log('Running processor');
  }
}
