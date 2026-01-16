import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as BullMQ from 'bullmq';
import Redis from 'ioredis';
import { IJobQueueService } from '@shared/interfaces/job-queue.interface';

const { Queue, Worker } = BullMQ;

@Injectable()
export class BullMQJobQueueService implements IJobQueueService, OnModuleInit {
  private queue: BullMQ.Queue<any, any, string>;
  private redis: Redis;
  private connectionOptions: { host: string; port: number };

  constructor(private readonly configService: ConfigService) {
    this.connectionOptions = {
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
    };

    this.redis = new Redis(this.connectionOptions);

    const queueName = this.configService.get<string>('queue.name', 'prompt-processing');
    this.queue = new Queue(queueName, {
      connection: this.connectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  }

  async onModuleInit() {
    // Queue is ready
  }

  async addJob(data: any, priority?: number, jobId?: string): Promise<void> {
    const jobOptions: any = {
      priority: priority || 0,
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
      },
    };

    // Use jobId for deduplication if provided
    if (jobId) {
      jobOptions.jobId = `prompt-${jobId}`;
    }

    await this.queue.add('process-prompt', data, jobOptions);
  }

  processJobs(processor: (job: any) => Promise<void>): void {
    const concurrency = this.configService.get<number>('queue.concurrency', 5);
    const worker = new Worker<any, any, string>(
      this.configService.get<string>('queue.name', 'prompt-processing'),
      async (job) => {
        await processor(job.data);
      },
      {
        connection: this.connectionOptions,
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  getQueue(): BullMQ.Queue<any, any, string> {
    return this.queue;
  }
}
