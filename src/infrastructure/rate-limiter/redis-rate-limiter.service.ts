import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IRateLimiterService, RateLimitStatus } from '@shared/interfaces/rate-limiter.interface';

@Injectable()
export class RedisRateLimiterService implements IRateLimiterService {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
    });
  }

  async checkLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const current = await this.client.incr(key);

    if (current === 1) {
      await this.client.pexpire(key, windowMs);
    }

    return current <= limit;
  }

  async increment(identifier: string, windowMs: number): Promise<number> {
    const key = `rate_limit:${identifier}`;
    const current = await this.client.incr(key);

    if (current === 1) {
      await this.client.pexpire(key, windowMs);
    }

    return current;
  }

  async getStatus(identifier: string, limit: number, windowMs: number): Promise<RateLimitStatus> {
    const key = `rate_limit:${identifier}`;
    const current = await this.client.get(key);
    const count = current ? parseInt(current, 10) : 0;
    const remaining = Math.max(0, limit - count);

    // Get TTL to calculate reset time
    const ttl = await this.client.pttl(key);
    const resetAt = ttl > 0 ? new Date(Date.now() + ttl) : new Date(Date.now() + windowMs);

    return {
      remaining,
      limit,
      resetAt,
      windowMs,
    };
  }
}
