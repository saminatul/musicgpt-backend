export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },
  rateLimit: {
    freeTier: parseInt(process.env.RATE_LIMIT_FREE_TIER || '20', 10),
    paidTier: parseInt(process.env.RATE_LIMIT_PAID_TIER || '100', 10),
    windowMs:  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),// 1 minute
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '60', 10), // 60 seconds
  },
  queue: {
    name: process.env.QUEUE_NAME || 'prompt-processing',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  },
  cron: {
    scanInterval: process.env.CRON_SCAN_INTERVAL || '*/30 * * * * *', // Every 30 seconds
  },
});
