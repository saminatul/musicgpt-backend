import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IPromptRepository } from '@domain/repositories/prompt.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IJobQueueService } from '@shared/interfaces/job-queue.interface';
import { Prompt, PromptStatus } from '@domain/entities/prompt.entity';
import { CreatePromptDto, PromptResponseDto } from '../dto/prompt.dto';

@Injectable()
export class PromptService {
  constructor(
    @Inject('IPromptRepository') private readonly promptRepository: IPromptRepository,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    @Inject('IJobQueueService') private readonly jobQueueService: IJobQueueService,
  ) {}

  async create(userId: string, dto: CreatePromptDto): Promise<PromptResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const prompt = await this.promptRepository.create({
      userId,
      text: dto.text,
      status: PromptStatus.PENDING,
    } as any);

    // Note: Job will be enqueued by the cron scheduler
    // This ensures consistent processing and prevents duplicate jobs
    // The cron job will scan for PENDING prompts and enqueue them with proper priority

    return this.toDto(prompt);
  }

  async findById(id: string, userId: string): Promise<PromptResponseDto> {
    const prompt = await this.promptRepository.findById(id);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }
    // Check if prompt belongs to the user
    if (prompt.userId !== userId) {
      throw new NotFoundException('Prompt not found');
    }
    return this.toDto(prompt);
  }

  async findByUserId(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const { prompts, total } = await this.promptRepository.findByUserId(userId, page, limit);
    return {
      data: prompts.map((p) => this.toDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toDto(prompt: Prompt): PromptResponseDto {
    return {
      id: prompt.id,
      text: prompt.text,
      status: prompt.status,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  }
}
