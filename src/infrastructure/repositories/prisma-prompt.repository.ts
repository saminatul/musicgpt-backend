import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IPromptRepository } from '@domain/repositories/prompt.repository.interface';
import { Prompt, PromptStatus } from '@domain/entities/prompt.entity';

@Injectable()
export class PrismaPromptRepository implements IPromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Prompt | null> {
    const prompt = await this.prisma.prompt.findUnique({ where: { id } });
    return prompt ? this.toDomain(prompt) : null;
  }

  async findByUserId(userId: string, page: number, limit: number): Promise<{ prompts: Prompt[]; total: number }> {
    const skip = (page - 1) * limit;
    const [prompts, total] = await Promise.all([
      this.prisma.prompt.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prompt.count({ where: { userId } }),
    ]);

    return {
      prompts: prompts.map((p) => this.toDomain(p)),
      total,
    };
  }

  async findByStatus(status: PromptStatus, limit?: number): Promise<Prompt[]> {
    const prompts = await this.prisma.prompt.findMany({
      where: { status },
      take: limit,
      orderBy: [
        { createdAt: 'asc' }, // Process older prompts first
      ],
    });
    return prompts.map((p) => this.toDomain(p));
  }

  async create(data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const prompt = await this.prisma.prompt.create({
      data: {
        userId: data.userId,
        text: data.text,
        status: data.status,
      },
    });
    return this.toDomain(prompt);
  }

  async update(id: string, data: Partial<Prompt>): Promise<Prompt> {
    const prompt = await this.prisma.prompt.update({
      where: { id },
      data: {
        ...(data.text && { text: data.text }),
        ...(data.status && { status: data.status }),
      },
    });
    return this.toDomain(prompt);
  }

  private toDomain(prismaPrompt: any): Prompt {
    return new Prompt(
      prismaPrompt.id,
      prismaPrompt.userId,
      prismaPrompt.text,
      prismaPrompt.status as PromptStatus,
      prismaPrompt.createdAt,
      prismaPrompt.updatedAt,
    );
  }
}
