export interface IJobQueueService {
  addJob(data: any, priority?: number, jobId?: string): Promise<void>;
  processJobs(processor: (job: any) => Promise<void>): void;
}