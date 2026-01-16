import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BullMQJobQueueService } from '../infrastructure/job-queue/bullmq-job-queue.service';
import { PromptProcessorService } from '../application/services/prompt-processor.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Worker');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const jobQueueService = app.get(BullMQJobQueueService);
    const promptProcessor = app.get(PromptProcessorService);

    logger.log('Worker started. Processing jobs...');

    jobQueueService.processJobs(async (jobData: any) => {
      const { promptId, userId, text, isPaid } = jobData;
      logger.log(`Processing job for prompt ${promptId} (user: ${userId}, paid: ${isPaid})`);
      try {
        await promptProcessor.processPrompt(promptId, userId, text);
        logger.log(`✅ Successfully processed prompt ${promptId}`);
      } catch (error) {
        logger.error(`❌ Error processing prompt ${promptId}:`, error);
        throw error; // Re-throw to let BullMQ handle retries
      }
    });

    logger.log('Worker is ready to process jobs');
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

bootstrap();
