import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { SubscriptionStatus } from '@domain/entities/user.entity';
import { SubscriptionResponseDto } from '../dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(@Inject('IUserRepository') private readonly userRepository: IUserRepository) {}

  async subscribe(userId: string): Promise<SubscriptionResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.userRepository.update(userId, {
      subscriptionStatus: SubscriptionStatus.PAID,
    } as any);

    return {
      subscriptionStatus: updated.subscriptionStatus,
      message: 'Subscription activated successfully',
    };
  }

  async cancel(userId: string): Promise<SubscriptionResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.userRepository.update(userId, {
      subscriptionStatus: SubscriptionStatus.FREE,
    } as any);

    return {
      subscriptionStatus: updated.subscriptionStatus,
      message: 'Subscription cancelled successfully',
    };
  }
}
