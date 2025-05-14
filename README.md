# Dipstick

Dependency injection framework built for typescript. No decorators or special symbols required!

## Features

- 🔒 **Type-safe** - Full TypeScript support with type checking
- 🏗️ **Code Generation** - Automatically generates implementations
- 📦 **Module-based** - Organize dependencies into modules
- 🧩 **Component-based** - Build components that depend on modules
- 🔄 **Lifecycle Management** - Support for both reusable and transient instances
- 🛠️ **CLI Tool** - Easy to use command-line interface

## Installation

```bash
npm install dipstick
```

## Quick Start

1. Define your modules:

```typescript
import { Module, Bind } from "dipstick";

export interface UserModule extends Module {
  userService: Bind<typeof UserService, IUserService>;
  userRepository: Bind<typeof UserRepository, IUserRepository>;
}
```

2. Define your components:

```typescript
import { Component, Reusable, Transient } from "dipstick";

export interface UserComponent extends Component<[UserModule]> {
  getUser(): Reusable<IUser>;
  createUser(): Transient<IUser>;
}
```

3. Generate implementations:

```bash
npx codegen ./tsconfig.json
```

## Key Concepts

### Modules

Modules are the building blocks of your dependency injection system. They define what can be created and how to create it.

```typescript
export interface DatabaseModule extends Module {
  connection: Bind<typeof DatabaseConnection, IDatabaseConnection>;
  queryBuilder: Bind<typeof QueryBuilder, IQueryBuilder>;
}
```

#### Bind

The `Bind` type is used to define how to create instances within modules. It takes one to two type parameters:

1. The constructor type
2. (Optional) The interface type. If none is provided, this is the inferred from the constructor type

```typescript
interface MyModule extends Module {
  myServiceInterface: Bind<typeof MyService, IMyService>;
  myService: Bind<typeof Myservice>;
}
```

#### Disambiguating Duplicated Types

While most dependency injection frameworks support things like using `@Named("blah")` to handle this situation, Dipstik is a little different. Simply create a new type with a descriptive name that can wrap the type you want to return:

```typescript
interface RateLimiter {
  isRateLimited(): boolean;
}

// Create some monads
type Service1<T> = T;
type Service2<T> = T;

// Use the monads to describe your intent
interface MyModule extends Module {
  service1RateLimiter: Bind<typeof RateLimiter, Service1<RateLimiter>>;
  service2RateLimiter: Bind<typeof RateLimiter, Service2<RateLimiter>>;
}
```

### Components

Components depend on modules and provide the ability to declare lifetimes for your dependencies. They can request both reusable (singleton) and transient (new instance each time) dependencies.

Create a new component by exporting an interface which extends `Component`.

```typescript
export interface UserComponent extends Component<...> {
    ...
}
```

#### Depending on Modules

The modules that a Component depends on are listed out in its type argument. Modules are used to create dependencies within the component whenever a new one is requested. In this example, our component depends on both `Module1` and `Module2`:

```typescript
export interface UserComponent extends Component<[Module1, Module2]> {
  getSomethingFromModule1(): IModule1Thing;
  getSomethingFromModule2(): IModule2Thing;
  getSomethingElseFromModule2(): AnotherModule2Thing;
}
```

#### Reusable vs Transient

Components can reuse created instances. To make use of this feature, wrap a component's return value in `Reusable`. By not including `Reusable` (or explicitly including `Transient`), the generated code will always return a new instance whenever one is requested.

- `Reusable<T>` - Returns the same instance every time (singleton)
- `Transient<T>` - Returns a new instance every time

## CLI Usage

```bash
# Generate implementations for all modules and components
npx codegen ./tsconfig.json

# Verbose output
npx codegen ./tsconfig.json --verbose
```

## Caveats

This project was 100% vibe coded over the course of a day. There are likely serious problems with it, such as the code being an unreadable mess of branching control flow. This will be addressed in future versions.

## Example

See the [example](./example) directory for a complete working example.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
