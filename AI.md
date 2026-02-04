# AI Instructions for Dipstick

## Overview

Dipstick is a TypeScript dependency injection framework that uses **code generation** and the **type system** instead of decorators or metadata reflection. It's designed to be type-safe, obvious, and work with TypeScript's strengths.

## Core Workflow

1. **Define** containers as exported type aliases
2. **Generate** implementation code with CLI
3. **Instantiate** generated container classes

## Critical Rules

### DO

- ✅ Export container types as `export type MyContainer = Container<{...}>`
- ✅ Use `Reusable<T>` for singleton-like behavior (same instance per container)
- ✅ Use `Transient<T>` for new instances on every call
- ✅ Use `Static<T>` for objects created outside the container
- ✅ Run `npx dipstick generate ./path/to/tsconfig.json` after defining containers
- ✅ Instantiate with generated `*Impl` classes (e.g., `new MyContainerImpl()`)
- ✅ Use `typeof functionName` for factory functions
- ✅ Define dependencies via `dependencies: [OtherContainer]` array
- ✅ Match dependencies by **type**, not by name or string tokens
- ✅ Prefer explicitly bound types (second type argument to bindings) if possible

### DO NOT

- ❌ Use decorators (Dipstick doesn't use them)
- ❌ Use `reflect-metadata` (not needed)
- ❌ Use string tokens or symbols for dependency identification
- ❌ Manually implement container classes (always generated)
- ❌ Create multiple bindings with the same return type in one container
- ❌ Expect containers to work without running code generation first

## Container Definition Pattern

```typescript
import { Container, Reusable, Transient, Static } from 'dipstick';

export type MyContainer = Container<{
  // Optional: dependencies on other containers
  dependencies: [OtherContainer];
  
  // Required: binding definitions
  bindings: {
    // Class binding with interface return type
    service: Reusable<ServiceImpl, IService>;
    
    // Class binding returning class type
    handler: Transient<RequestHandler>;
    
    // Factory function binding (automatically infers return type)
    database: Reusable<typeof createDatabase>;
    
    // Static binding (provided at instantiation)
    config: Static<Config>;
  };
}>;
```

## Binding Types Explained

### Reusable<T, R?>
- **Behavior**: Returns the same instance every time within a container instance
- **Use for**: Services, singletons, database connections, loggers
- **Pattern**: `bindingName: Reusable<ImplementationType, ReturnType>`
- **Example**: `logger: Reusable<Logger, ILogger>`

### Transient<T, R?>
- **Behavior**: Creates a new instance every time
- **Use for**: Request handlers, temporary objects, commands
- **Pattern**: `bindingName: Transient<ImplementationType, ReturnType>`
- **Example**: `handler: Transient<UserHandler>`

### Static<T>
- **Behavior**: Provided externally when instantiating container
- **Use for**: Runtime configuration, request/response objects, external resources
- **Pattern**: `bindingName: Static<Type>`
- **Example**: `config: Static<AppConfig>`
- **Instantiation**: `new MyContainerImpl({ config: myConfig })`

## Type Arguments

All bindings take 1 or 2 type arguments:

1. **First argument** (required):
   - A class name: `MyClass` → will instantiate with `new`
   - A function with `typeof`: `typeof myFunction` → will call function
   
2. **Second argument** (optional):
   - Return type (usually an interface): `IMyService`
   - If omitted with `typeof`, automatically uses `ReturnType<typeof fn>`

## Factory Functions with typeof

When using factory functions, Dipstick automatically infers the return type:

```typescript
function createDatabase(config: Config): Database {
  return new PostgresDatabase(config);
}

export type AppContainer = Container<{
  bindings: {
    // Type is automatically inferred as Database
    db: Reusable<typeof createDatabase>;
  };
}>;
```

Other containers can depend on this using the return type:

```typescript
class UserService {
  constructor(private db: Database) {} // Matches by type
}

export type ServiceContainer = Container<{
  dependencies: [AppContainer];
  bindings: {
    userService: Reusable<UserService>;
  };
}>;
```

## Dependency Resolution

Dipstick resolves dependencies by **matching parameter types** to binding return types:

```typescript
class ServiceA {
  constructor(private logger: ILogger) {} // Looks for binding returning ILogger
}

export type Container1 = Container<{
  bindings: {
    logger: Reusable<Logger, ILogger>; // ✅ Matches ILogger
    serviceA: Transient<ServiceA>;
  };
}>;
```

**Important**: Parameter names don't matter, only types matter.

## Container Composition

Containers can depend on other containers:

```typescript
// Base container
export type LoggingContainer = Container<{
  bindings: {
    logger: Reusable<Logger, ILogger>;
  };
}>;

// Container that depends on LoggingContainer
export type AppContainer = Container<{
  dependencies: [LoggingContainer]; // Array of container types
  bindings: {
    userService: Reusable<UserService>; // Can use ILogger from LoggingContainer
  };
}>;

// Instantiation
const loggingContainer = new LoggingContainerImpl();
const appContainer = new AppContainerImpl([loggingContainer]);
```

With both dependencies and static bindings:

```typescript
const appContainer = new AppContainerImpl(
  { config: myConfig },      // Static bindings first
  [loggingContainer]         // Dependencies second
);
```

## Code Generation

After defining or modifying containers:

```bash
# Basic usage
npx dipstick generate ./tsconfig.json

# With verbose output
npx dipstick generate ./tsconfig.json --verbose
```

**What it does**:
- Scans TypeScript files for exported `Container` type aliases
- Generates `*Impl` classes for each container
- Creates dependency injection wiring
- Ensures type safety across the dependency graph

**Generated files**: Typically creates implementation files alongside your container definitions.

**If generation fails**: Errors about missing or unresolved dependencies usually mean that a constructor parameter type cannot be resolved. Check that:
- All constructor parameter types have corresponding bindings in the container
- Or the parameter types are provided by a container in the `dependencies` array
- The return type of bindings matches the parameter type exactly (including interface names)

## Complete Example

```typescript
// 1. Define containers
import { Container, Reusable, Transient, Static } from 'dipstick';

interface ILogger {
  log(message: string): void;
}

class Logger implements ILogger {
  log(message: string) {
    console.log(message);
  }
}

class Database {
  constructor(private config: Config) {}
}

class UserService {
  constructor(
    private db: Database,
    private logger: ILogger
  ) {}
  
  async getUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

interface Config {
  dbUrl: string;
}

export type AppContainer = Container<{
  bindings: {
    config: Static<Config>;
    database: Reusable<Database>;
    logger: Reusable<Logger, ILogger>;
    userService: Transient<UserService>;
  };
}>;

// 2. Generate code (run in terminal)
// npx dipstick generate ./tsconfig.json

// 3. Use the container
const container = new AppContainerImpl({
  config: { dbUrl: 'postgres://localhost/mydb' }
});

const userService = container.userService(); // Returns UserService instance
await userService.getUser('123');
```

## Common Mistakes & Solutions

### ❌ Mistake: Not running code generation
**Error**: Cannot find name 'MyContainerImpl'
**Solution**: Run `npx dipstick generate ./tsconfig.json`

### ❌ Mistake: Not exporting container type
```typescript
type MyContainer = Container<{...}>; // ❌ Not exported
```
**Solution**: Always export container types
```typescript
export type MyContainer = Container<{...}>; // ✅ Exported
```

### ❌ Mistake: Multiple bindings with same return type
```typescript
export type Bad = Container<{
  bindings: {
    userService1: Reusable<UserService>; // Both return UserService
    userService2: Reusable<UserService>; // ❌ Ambiguous!
  };
}>;
```
**Solution**: Use different return types or split into separate containers

### ❌ Mistake: Forgetting Static binding constructor argument
```typescript
export type MyContainer = Container<{
  bindings: {
    config: Static<Config>;
  };
}>;

const container = new MyContainerImpl(); // ❌ Missing config!
```
**Solution**: Provide static bindings in constructor
```typescript
const container = new MyContainerImpl({ config: myConfig }); // ✅
```

### ❌ Mistake: Using string tokens or decorators
```typescript
@Injectable() // ❌ Wrong framework
class MyService {}
```
**Solution**: Dipstick doesn't use decorators. Just use plain TypeScript classes.

### ❌ Mistake: Missing or unresolved dependencies during code generation
**Error**: Code generation fails with errors about unresolved types or missing dependencies
```typescript
class UserService {
  constructor(private emailService: IEmailService) {} // IEmailService not bound
}

export type AppContainer = Container<{
  bindings: {
    userService: Reusable<UserService>; // ❌ emailService dependency not provided
  };
}>;
```
**Solution**: Add bindings for all constructor parameter types, or add a container dependency that provides them
```typescript
// Option 1: Add the missing binding to the same container
export type AppContainer = Container<{
  bindings: {
    emailService: Reusable<EmailService, IEmailService>; // ✅ Now provided
    userService: Reusable<UserService>;
  };
}>;

// Option 2: Add a dependency on another container that provides it
export type AppContainer = Container<{
  dependencies: [EmailContainer]; // EmailContainer provides IEmailService
  bindings: {
    userService: Reusable<UserService>; // ✅ IEmailService resolved from dependency
  };
}>;
```
**Note**: All constructor parameter types must be resolvable either from the container's own bindings or from its dependencies.

## When to Use Which Binding Type

| Use Case | Binding Type | Reason |
|----------|-------------|--------|
| Database connection | `Reusable` | Share one connection per scope |
| Logger | `Reusable` | Same logger instance throughout scope |
| Configuration | `Static` | Created outside, passed in |
| Request handler | `Transient` | Fresh instance per request |
| Service with no state | `Reusable` | More efficient to reuse |
| Service with mutable state | `Transient` | Avoid shared state issues |
| External object (req/res) | `Static` | Created by framework, not DI |

## Type Safety Notes

- Dipstick preserves your type definitions
- No `any` types are introduced
- Constructor parameter types must match binding return types exactly
- TypeScript compiler will catch mismatches before generation
- Generated code is readable TypeScript

## Integration with Tests

For testing, you can create mock containers:

```typescript
class MockUserService implements IUserService {
  async getUser(id: string) {
    return { id, name: 'Test User' };
  }
}

export type TestContainer = Container<{
  bindings: {
    userService: Reusable<MockUserService, IUserService>;
  };
}>;

// Generate and use in tests
const testContainer = new TestContainerImpl();
const mockService = testContainer.userService();
```

## Summary for LLMs

When helping users with Dipstick:

1. **Always** suggest running code generation after defining containers
2. **Always** export container type aliases
3. **Match by type**, not by name
4. **Suggest Reusable** for most services (default choice)
5. **Suggest Transient** when fresh instances are needed
6. **Suggest Static** for externally created objects
7. **Remember** that generated classes have `Impl` suffix
8. **Check** that parameter types match available binding return types - if code generation fails with unresolved dependency errors, add missing bindings to the container or add a dependency on another container that provides them
9. **Use** `dependencies` array for container composition
10. **Don't** suggest decorators or reflection metadata

This is a code-generation-based framework, not a runtime-reflection framework.
