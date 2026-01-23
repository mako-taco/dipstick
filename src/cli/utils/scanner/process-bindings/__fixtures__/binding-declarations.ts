import { Static, Reusable, Transient } from '../../../../lib/index';
import {
  UserService,
  EmailService,
  DatabaseService,
  SimpleService,
  createUserService,
  createEmailService,
  UserConfig,
  DatabaseConfig,
  ComplexLiteralType,
  IUserService,
  IEmailService,
  IDatabaseService,
} from './binding-test-types';
import {
  ImportedImplementation,
  importedFactory,
  ImportedConfig,
  IImportedService,
} from './imported-types';
import {
  TypeAliasService,
  createTypeAliasService,
  DatabaseUrl,
  ApiKey,
  Port,
} from './type-alias-parameters';
import {
  ImportedAliasService,
  createImportedAliasService,
} from './imported-alias-service';
import { ApiKey as ImportedApiKey, ServiceUrl } from './imported-alias-types';

// Static bindings - single type argument
export type StaticUserConfig = Static<UserConfig>;
export type StaticDatabaseConfig = Static<DatabaseConfig>;
export type StaticComplexType = Static<ComplexLiteralType>;

// Static binding with literal type (no alias)
export type StaticLiteralType = Static<{
  name: string;
  value: number;
  settings: {
    enabled: boolean;
    timeout: number;
  };
}>;

// Static binding with typeof (should throw error)
export type StaticWithTypeof = Static<typeof createUserService>;

// Reusable bindings - single type argument (class constructor)
export type ReusableSimpleService = Reusable<SimpleService>;
export type ReusableEmailService = Reusable<EmailService>;

// Reusable bindings - two type arguments (implementation, interface)
export type ReusableUserService = Reusable<UserService, IUserService>;
export type ReusableDatabaseService = Reusable<
  DatabaseService,
  IDatabaseService
>;

// Reusable bindings with typeof (constructor reference)
export type ReusableWithTypeof = Reusable<typeof createUserService>;

// Reusable bindings with factory functions
export type ReusableFactory = Reusable<typeof createEmailService>;

// Transient bindings - single type argument
export type TransientSimpleService = Transient<SimpleService>;

// Transient bindings - two type arguments
export type TransientUserService = Transient<UserService, IUserService>;
export type TransientEmailService = Transient<EmailService, IEmailService>;

// Transient bindings with typeof
export type TransientWithTypeof = Transient<typeof createUserService>;

// Transient bindings with factory functions
export type TransientFactory = Transient<typeof importedFactory>;

// Imported bindings (for testing import resolution)
export type ImportedReusable = Reusable<
  ImportedImplementation,
  IImportedService
>;
export type ImportedTransient = Transient<ImportedImplementation>;
export type ImportedStatic = Static<ImportedConfig>;

// Complex container type structure for integration testing
export type TestContainerBindings = {
  userService: ReusableUserService;
  emailService: TransientEmailService;
  databaseService: ReusableDatabaseService;
  userConfig: StaticUserConfig;
  importedService: ImportedReusable;
};

// Type alias parameter bindings - for testing that type aliases are preserved
export type StaticDatabaseUrl = Static<DatabaseUrl>;
export type StaticApiKey = Static<ApiKey>;

// Reusable binding with factory that uses type alias parameters
export type ReusableTypeAliasFactory = Reusable<typeof createTypeAliasService>;

// Reusable binding with class that uses type alias parameters
export type ReusableTypeAliasClass = Reusable<TypeAliasService>;

// Imported type alias tests - class and factory in separate file from type alias
export type ReusableImportedAliasService = Reusable<ImportedAliasService>;
export type ReusableImportedAliasFactory = Reusable<
  typeof createImportedAliasService
>;

// Static bindings for imported type aliases
export type StaticImportedApiKey = Static<ImportedApiKey>;
export type StaticServiceUrl = Static<ServiceUrl>;
