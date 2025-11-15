export { Logger, User, createLogger } from './named-exports';
export { default as DefaultConfig } from './default-exports';
export { HttpClient, API_VERSION as ApiVersion } from './mixed-exports';

// Local exports
const LOCAL_CONSTANT = 'local';
const ANOTHER_LOCAL = 'test';

export { LOCAL_CONSTANT, ANOTHER_LOCAL };
