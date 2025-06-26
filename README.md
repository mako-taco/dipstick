`# Dipstick

A dependency injection framework for TypeScript that uses code generation to create type-safe dependency injection containers.

## Installation

```bash
npm install dipstick
```

## Overview

Dipstick uses TypeScript's type system and code generation to create dependency injection containers. The framework is designed to be type-safe and easy to use, with a focus on maintainability and developer experience.

## Core Concepts

### Modules

Modules are the core building blocks of Dipstick. They allow you to bind implementations to types that are used throughout your project. To create a module, export a type alias to `dip.Module`:

```typescript
import { dip } from 'dipstick';

interface IFoo {}
class Foo implements IFoo {}

export type MyModule = dip.Module<{
  bindings: {
    foo: dip.Bind.Reusable<Foo, IFoo>;
  };
}>;
```

### Bindings

Dipstick supports three types of bindings:

#### Reusable Bindings

Reusable bindings return the same instance every time they are called. This is useful for singletons or other objects that should only be created once per module:

```typescript
export type MyModule = dip.Module<{
  bindings: {
    // Returns the same Foo instance every time
    foo: dip.Bind.Reusable<Foo, IFoo>;
  };
}>;
```

#### Transient Bindings

Transient bindings return a new instance every time they are called. This is useful for objects that should be created fresh each time they are requested:

```typescript
export type MyModule = dip.Module<{
  bindings: {
    // Returns a new Bar instance every time
    bar: dip.Bind.Transient<Bar>;
  };
}>;
```

#### Module Bindings

Module bindings are used to create child modules. A child module will use its parent to resolve dependencies that it cannot resolve itself:

```typescript
// Parent module
export type ParentModule = dip.Module<{
  bindings: {
    foo: dip.Bind.Reusable<Foo>;
  };
}>;

// Child module
export type ChildModule = dip.Module<{
  parent: ParentModule;
  bindings: {
    bar: dip.Bind.Transient<Bar>;
  };
}>;

// Module that can create child modules
export type ModuleFactory = dip.Module<{
  bindings: {
    createChild: dip.Bind.Module<ParentModule, ChildModule>;
  };
}>;
```

### Dependencies

Modules can depend on other modules. These dependencies are used to resolve types that the module cannot resolve itself:

```typescript
class Foo {
  constructor(bar: Bar) {}
}

export type FooModule = dip.Module<{
  bindings: {
    foo: dip.Bind.Reusable<Foo>;
  };
}>;

export type BarModule = dip.Module<{
  dependencies: [FooModule];
  bindings: {
    bar: dip.Bind.Transient<Bar>;
  };
}>;
```

### Provided Dependencies

Modules can have dependencies that are provided at construction time, using `Static` bindings. This is useful for creating scoped modules, such as request-scoped modules in a web application:

```typescript
// Request-scoped module which is a child of MainModule
export type RequestModule = dip.Module<{
  bindings: {
    user: dip.Bind.Reusable<User>;
    handler: dip.Bind.Reusable<RequestHandler>;
    request: dip.bind.Static<Request>;
    response: dip.bind.Static<Response>;
  };
}>;

// A class that does things with objects from the request scope
export class RequestHandler {
  constructor(request: Request, response: Response);

  run() {
    response.send(200, request.headers['content-length']);
  }
}

// Now when you get a request, create the child module
app.use((request: Request, response: Response) => {
  const mainModule = new RequestModule_Impl([], { request, response });
  const handler = mainModule.requestModule({ request, response }).handler();
  handler.run();
});
```

## Usage

1. Define your modules using type aliases to `dip.Module`
2. Run the code generator:
   ```bash
   npm exec -- dipstick generate ./path/to/tsconfig.json --verbose
   ```
3. Use the generated modules in your application:
   ```typescript
   const parentModule = new ParentModule_Impl();
   const requestModule = parentModule.createRequestModule(new Request());
   const service = requestModule.requestService();
   ```

## Code Generation

The code generator will:

1. Scan your TypeScript files for exported module type aliases
2. Generate implementation classes for each module
3. Handle dependency injection and binding resolution
4. Ensure type safety throughout the dependency graph

## Contributing

Contributions are welcome! Please see our [CONTRIBUTORS.md](./CONTRIBUTORS.md) guide for detailed information about:

- Setting up the development environment
- Running tests and code quality checks
- Code style guidelines
- Submitting pull requests

For quick contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run check && npm test`
5. Submit a Pull Request
   `
