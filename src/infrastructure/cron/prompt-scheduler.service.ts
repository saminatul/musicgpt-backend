import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IPromptRepository } from '@domain/repositories/prompt.repository.interface';
import { IJobQueueService } from '@shared/interfaces/job-queue.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { PromptStatus } from '@domain/entities/prompt.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PromptSchedulerService {
  private readonly logger = new Logger(PromptSchedulerService.name);

  constructor(
    @Inject('IPromptRepository') private readonly promptRepository: IPromptRepository,
    @Inject('IJobQueueService') private readonly jobQueueService: IJobQueueService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds (configurable via CRON_SCAN_INTERVAL)
  async scanAndEnqueuePendingPrompts() {
    this.logger.log('Scanning for pending prompts...');

    try {
      const pendingPrompts = await this.promptRepository.findByStatus(PromptStatus.PENDING, 50);

      if (pendingPrompts.length === 0) {
        this.logger.debug('No pending prompts found');
        return;
      }

      this.logger.log(`Found ${pendingPrompts.length} pending prompts`);

      let enqueuedCount = 0;
      let skippedCount = 0;

      // Enqueue each prompt with priority based on user subscription
      for (const prompt of pendingPrompts) {
        try {
          const user = await this.userRepository.findById(prompt.userId);
          if (!user) {
            this.logger.warn(`User ${prompt.userId} not found for prompt ${prompt.id}`);
            skippedCount++;
            continue;
          }

          // PAID users get higher priority (10), FREE users get lower (1)
          const priority = user.isPaid() ? 10 : 1;

          // Use prompt ID as jobId to prevent duplicate jobs
          await this.jobQueueService.addJob(
            {
              promptId: prompt.id,
              userId: prompt.userId,
              text: prompt.text,
              isPaid: user.isPaid(),
            },
            priority,
            prompt.id, // Use prompt ID as jobId for deduplication
          );

          this.logger.debug(`Enqueued prompt ${prompt.id} (user: ${user.email}, priority: ${priority}, paid: ${user.isPaid()})`);
          enqueuedCount++;
        } catch (error) {
          this.logger.error(`Error enqueueing prompt ${prompt.id}:`, error);
          skippedCount++;
        }
      }

      this.logger.log(`Enqueued ${enqueuedCount} prompts, skipped ${skippedCount}`);
    } catch (error) {
      this.logger.error('Error scanning and enqueueing prompts:', error);
    }
  }
}
