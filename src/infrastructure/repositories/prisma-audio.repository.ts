import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IAudioRepository } from '@domain/repositories/audio.repository.interface';
import { Audio } from '@domain/entities/audio.entity';

@Injectable()
export class PrismaAudioRepository implements IAudioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Audio | null> {
    const audio = await this.prisma.audio.findUnique({ where: { id } });
    return audio ? this.toDomain(audio) : null;
  }

  async findAll(page: number, limit: number): Promise<{ audios: Audio[]; total: number }> {
    const skip = (page - 1) * limit;
    const [audios, total] = await Promise.all([
      this.prisma.audio.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.audio.count(),
    ]);

    return {
      audios: audios.map((a) => this.toDomain(a)),
      total,
    };
  }

  async findByUserId(userId: string, page: number, limit: number): Promise<{ audios: Audio[]; total: number }> {
    const skip = (page - 1) * limit;
    const [audios, total] = await Promise.all([
      this.prisma.audio.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.audio.count({ where: { userId } }),
    ]);

    return {
      audios: audios.map((a) => this.toDomain(a)),
      total,
    };
  }

  async findByPromptId(promptId: string): Promise<Audio | null> {
    const audio = await this.prisma.audio.findUnique({ where: { promptId } });
    return audio ? this.toDomain(audio) : null;
  }

  async create(data: Omit<Audio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Audio> {
    const audio = await this.prisma.audio.create({
      data: {
        promptId: data.promptId,
        userId: data.userId,
        title: data.title,
        url: data.url,
      },
    });
    return this.toDomain(audio);
  }

  async update(id: string, data: Partial<Audio>): Promise<Audio> {
    const audio = await this.prisma.audio.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.url && { url: data.url }),
      },
    });
    return this.toDomain(audio);
  }

  async search(query: string, cursor?: string, limit: number = 10): Promise<{ audios: Audio[]; nextCursor?: string }> {
    const take = limit + 1;
    const where = {
      title: { contains: query, mode: 'insensitive' as const },
    };

    const audios = cursor
      ? await this.prisma.audio.findMany({
          where,
          take,
          cursor: { id: cursor },
          skip: 1,
          orderBy: { id: 'asc' },
        })
      : await this.prisma.audio.findMany({
          where,
          take,
          orderBy: { id: 'asc' },
        });

    const hasNext = audios.length > limit;
    const results = hasNext ? audios.slice(0, limit) : audios;
    const nextCursor = hasNext ? results[results.length - 1].id : undefined;

    return {
      audios: results.map((a) => this.toDomain(a)),
      nextCursor,
    };
  }

  private toDomain(prismaAudio: any): Audio {
    return new Audio(
      prismaAudio.id,
      prismaAudio.promptId,
      prismaAudio.userId,
      prismaAudio.title,
      prismaAudio.url,
      prismaAudio.createdAt,
      prismaAudio.updatedAt,
    );
  }
}
