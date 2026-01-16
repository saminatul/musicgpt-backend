export enum PromptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export class Prompt {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly text: string,
    public status: PromptStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  markAsProcessing(): void {
    this.status = PromptStatus.PROCESSING;
  }

  markAsCompleted(): void {
    this.status = PromptStatus.COMPLETED;
  }
}