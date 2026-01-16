import { Injectable, Inject, Logger } from '@nestjs/common';
import { IPromptRepository } from '@domain/repositories/prompt.repository.interface';
import { IAudioRepository } from '@domain/repositories/audio.repository.interface';
import { IWebSocketService } from '@shared/interfaces/websocket.interface';
import { PromptStatus } from '@domain/entities/prompt.entity';
import { AudioService } from './audio.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PromptProcessorService {
  private readonly logger = new Logger(PromptProcessorService.name);

  constructor(
    @Inject('IPromptRepository') private readonly promptRepository: IPromptRepository,
    @Inject('IAudioRepository') private readonly audioRepository: IAudioRepository,
    private readonly audioService: AudioService,
    @Inject('IWebSocketService') private readonly websocketService: IWebSocketService,
  ) {}

  async processPrompt(promptId: string, userId: string, text: string): Promise<void> {
    this.logger.log(`Processing prompt ${promptId} for user ${userId}`);

    // Idempotency check: Verify prompt exists and is in PENDING status
    const prompt = await this.promptRepository.findById(promptId);
    if (!prompt) {
      this.logger.error(`Prompt ${promptId} not found`);
      throw new Error(`Prompt ${promptId} not found`);
    }

    // Check if already processed (idempotency)
    if (prompt.status === PromptStatus.COMPLETED) {
      // Check if audio already exists
      const existingAudio = await this.audioRepository.findByPromptId(promptId);
      if (existingAudio) {
        this.logger.log(`Prompt ${promptId} already completed, sending notification`);
        // Already processed, just send notification
        this.websocketService.emitToUser(userId, 'prompt:completed', {
          promptId,
          audioId: existingAudio.id,
          title: existingAudio.title,
          url: existingAudio.url,
          message: 'Your prompt has been processed successfully',
        });
        return;
      }
    }

    // Check if already processing (prevent duplicate processing)
    if (prompt.status === PromptStatus.PROCESSING) {
      this.logger.warn(`Prompt ${promptId} is already being processed, waiting...`);
      // Another worker might be processing this, wait a bit and check again
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const recheckPrompt = await this.promptRepository.findById(promptId);
      if (recheckPrompt?.status === PromptStatus.COMPLETED) {
        const existingAudio = await this.audioRepository.findByPromptId(promptId);
        if (existingAudio) {
          this.logger.log(`Prompt ${promptId} completed by another worker, sending notification`);
          this.websocketService.emitToUser(userId, 'prompt:completed', {
            promptId,
            audioId: existingAudio.id,
            title: existingAudio.title,
            url: existingAudio.url,
            message: 'Your prompt has been processed successfully',
          });
          return;
        }
      }
      if (recheckPrompt?.status === PromptStatus.PROCESSING) {
        this.logger.error(`Prompt ${promptId} is still being processed by another worker`);
        throw new Error(`Prompt ${promptId} is already being processed`);
      }
    }

    // Atomic status update to PROCESSING
    this.logger.log(`Updating prompt ${promptId} status to PROCESSING`);
    prompt.markAsProcessing();
    await this.promptRepository.update(promptId, { status: PromptStatus.PROCESSING });

    try {
      // Simulate generation delay (2-5 seconds)
      const delay = Math.random() * 3000 + 2000;
      this.logger.log(`Simulating audio generation for prompt ${promptId} (${Math.round(delay)}ms delay)`);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Create audio entry
      const audioTitle = `Audio for: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
      const audioUrl = `https://example.com/audio/${uuidv4()}.mp3`;

      this.logger.log(`Creating audio for prompt ${promptId}`);
      const audio = await this.audioService.create(promptId, userId, audioTitle, audioUrl);

      // Atomic status update to COMPLETED
      this.logger.log(`Updating prompt ${promptId} status to COMPLETED`);
      prompt.markAsCompleted();
      await this.promptRepository.update(promptId, { status: PromptStatus.COMPLETED });

      // Send WebSocket notification only after successful completion
      this.logger.log(`Sending WebSocket notification to user ${userId} for prompt ${promptId}`);
      this.websocketService.emitToUser(userId, 'prompt:completed', {
        promptId,
        audioId: audio.id,
        title: audio.title,
        url: audio.url,
        message: 'Your prompt has been processed successfully',
      });

      this.logger.log(`Successfully processed prompt ${promptId}`);
    } catch (error) {
      this.logger.error(`Error processing prompt ${promptId}:`, error);
      // On error, reset status to PENDING so it can be retried
      await this.promptRepository.update(promptId, { status: PromptStatus.PENDING });
      throw error;
    }
  }
}
