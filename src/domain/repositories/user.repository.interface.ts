import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  findAll(page: number, limit: number): Promise<{ users: User[]; total: number }>;
  search(query: string, cursor?: string, limit?: number): Promise<{ users: User[]; nextCursor?: string }>;
}