export enum SubscriptionStatus {
  FREE = 'FREE',
  PAID = 'PAID',
}

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string,
    public readonly displayName: string,
    public subscriptionStatus: SubscriptionStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isPaid(): boolean {
    return this.subscriptionStatus === SubscriptionStatus.PAID;
  }
}