import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { IAudioRepository } from '@domain/repositories/audio.repository.interface';
import { ICacheService } from '@shared/interfaces/cache.interface';
import { Audio } from '@domain/entities/audio.entity';
import { UpdateAudioDto, AudioResponseDto, PaginatedAudioResponseDto } from '../dto/audio.dto';

@Injectable()
export class AudioService {
  constructor(
    @Inject('IAudioRepository') private readonly audioRepository: IAudioRepository,
    @Inject('ICacheService') private readonly cacheService: ICacheService,
  ) {}

  async findByUserId(userId: string, page: number = 1, limit: number = 10): Promise<PaginatedAudioResponseDto> {
    const cacheKey = `audios:user:${userId}:page:${page}:limit:${limit}`;
    const cached = await this.cacheService.get<PaginatedAudioResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const { audios, total } = await this.audioRepository.findByUserId(userId, page, limit);
    const result: PaginatedAudioResponseDto = {
      data: audios.map((a) => this.toDto(a)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async findById(id: string, userId: string): Promise<AudioResponseDto> {
    const cacheKey = `audio:${id}`;
    const cached = await this.cacheService.get<AudioResponseDto>(cacheKey);
    
    const audio = await this.audioRepository.findById(id);
    if (!audio) {
      throw new NotFoundException('Audio not found');
    }

    // Check if audio belongs to the user
    if (audio.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this audio');
    }

    const result = cached || this.toDto(audio);
    if (!cached) {
      await this.cacheService.set(cacheKey, result);
    }
    return result;
  }

  async update(id: string, dto: UpdateAudioDto, userId: string): Promise<AudioResponseDto> {
    const audio = await this.audioRepository.findById(id);
    if (!audio) {
      throw new NotFoundException('Audio not found');
    }

    // Check if audio belongs to the user
    if (audio.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this audio');
    }

    const updated = await this.audioRepository.update(id, dto);

    // Invalidate cache
    await this.cacheService.delete(`audio:${id}`);
    await this.cacheService.deletePattern(`audios:user:${userId}:page:*`);

    return this.toDto(updated);
  }

  async create(promptId: string, userId: string, title: string, url: string): Promise<Audio> {
    // Check if audio already exists for this prompt (idempotency)
    const existingAudio = await this.audioRepository.findByPromptId(promptId);
    if (existingAudio) {
      return existingAudio;
    }

    const audio = await this.audioRepository.create({
      promptId,
      userId,
      title,
      url,
    } as any);

    // Invalidate cache
    await this.cacheService.deletePattern(`audios:user:${userId}:page:*`);

    return audio;
  }

  // Keep the old method signature for backward compatibility (returns DTO)
  async createAudio(promptId: string, userId: string, title: string, url: string): Promise<AudioResponseDto> {
    const audio = await this.create(promptId, userId, title, url);
    return this.toDto(audio);
  }

  private toDto(audio: Audio): AudioResponseDto {
    return {
      id: audio.id,
      promptId: audio.promptId,
      title: audio.title,
      url: audio.url,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
    };
  }
}
