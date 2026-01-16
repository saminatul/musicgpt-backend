import { Prompt, PromptStatus } from '../entities/prompt.entity';

export interface IPromptRepository {
  findById(id: string): Promise<Prompt | null>;
  findByUserId(userId: string, page: number, limit: number): Promise<{ prompts: Prompt[]; total: number }>;
  findByStatus(status: PromptStatus, limit?: number): Promise<Prompt[]>;
  create(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt>;
  update(id: string, data: Partial<Prompt>): Promise<Prompt>;
}