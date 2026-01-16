import { Injectable, ExecutionContext, CallHandler, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRateLimiterService } from '@shared/interfaces/rate-limiter.interface';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/repositories/user.repository.interface';

@Injectable()
export class RateLimitInterceptor {
  constructor(
    @Inject('IRateLimiterService') private readonly rateLimiter: IRateLimiterService,
    private readonly configService: ConfigService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    // Get user's subscription status
    const userEntity = await this.userRepository.findById(user.id);
    if (!userEntity) {
      return next.handle();
    }

    // Determine rate limit based on subscription
    const isPaid = userEntity.subscriptionStatus === SubscriptionStatus.PAID;
    const limit = isPaid
      ? this.configService.get<number>('rateLimit.paidTier')
      : this.configService.get<number>('rateLimit.freeTier');
    const windowMs = this.configService.get<number>('rateLimit.windowMs');

    const identifier = `user:${user.id}`;
    const allowed = await this.rateLimiter.checkLimit(identifier, limit, windowMs);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          limit,
          windowMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
