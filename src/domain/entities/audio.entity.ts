export class Audio {
  constructor(
    public readonly id: string,
    public readonly promptId: string,
    public readonly userId: string,
    public title: string,
    public url: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}