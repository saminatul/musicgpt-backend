import { Audio } from '../entities/audio.entity';

export interface IAudioRepository {
  findById(id: string): Promise<Audio | null>;
  findAll(page: number, limit: number): Promise<{ audios: Audio[]; total: number }>;
  findByUserId(userId: string, page: number, limit: number): Promise<{ audios: Audio[]; total: number }>;
  findByPromptId(promptId: string): Promise<Audio | null>;
  create(audio: Omit<Audio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Audio>;
  update(id: string, data: Partial<Audio>): Promise<Audio>;
  search(query: string, cursor?: string, limit?: number): Promise<{ audios: Audio[]; nextCursor?: string }>;
}