export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
  windowMs: number;
}

export interface IRateLimiterService {
  checkLimit(identifier: string, limit: number, windowMs: number): Promise<boolean>;
  increment(identifier: string, windowMs: number): Promise<number>;
  getStatus(identifier: string, limit: number, windowMs: number): Promise<RateLimitStatus>;
}