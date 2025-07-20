// Basic types for testing resolveType function

export interface IUserService {
  getUser(id: string): User;
  createUser(userData: CreateUserRequest): User;
}

export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): void;
}

export interface IRepository<T> {
  findById(id: string): T | null;
  save(entity: T): T;
  delete(id: string): void;
}

export class UserService implements IUserService {
  getUser(id: string): User {
    return { id, name: 'Test User', email: 'test@example.com' };
  }

  createUser(userData: CreateUserRequest): User {
    return {
      id: 'new-id',
      name: userData.name,
      email: userData.email,
    };
  }
}

export class EmailService implements IEmailService {
  sendEmail(to: string, subject: string, body: string): void {
    console.log(`Sending email to ${to}: ${subject}`);
  }
}

export class UserRepository implements IRepository<User> {
  findById(id: string): User | null {
    return { id, name: 'Found User', email: 'found@example.com' };
  }

  save(entity: User): User {
    return entity;
  }

  delete(id: string): void {
    console.log(`Deleted user ${id}`);
  }
}

export type User = {
  id: string;
  name: string;
  email: string;
};

export type CreateUserRequest = {
  name: string;
  email: string;
};

export type UserServiceFactory = () => IUserService;

export type ServiceMap = {
  userService: IUserService;
  emailService: IEmailService;
  userRepository: IRepository<User>;
};
