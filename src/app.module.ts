import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Infrastructure
import { PrismaService } from './infrastructure/database/prisma.service';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaPromptRepository } from './infrastructure/repositories/prisma-prompt.repository';
import { PrismaAudioRepository } from './infrastructure/repositories/prisma-audio.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { RedisCacheService } from './infrastructure/cache/redis-cache.service';
import { RedisRateLimiterService } from './infrastructure/rate-limiter/redis-rate-limiter.service';
import { BullMQJobQueueService } from './infrastructure/job-queue/bullmq-job-queue.service';
import { SocketIOWebSocketService } from './infrastructure/websocket/socket-io-websocket.service';

// Application Services
import { AuthService } from './application/services/auth.service';
import { UserService } from './application/services/user.service';
import { PromptService } from './application/services/prompt.service';
import { AudioService } from './application/services/audio.service';
import { SubscriptionService } from './application/services/subscription.service';
import { SearchService } from './application/services/search.service';
import { PromptProcessorService } from './application/services/prompt-processor.service';

// Presentation
import { JwtStrategy } from './presentation/strategies/jwt.strategy';
import { AuthController } from './presentation/controllers/auth.controller';
import { UserController } from './presentation/controllers/user.controller';
import { PromptController } from './presentation/controllers/prompt.controller';
import { AudioController } from './presentation/controllers/audio.controller';
import { SubscriptionController } from './presentation/controllers/subscription.controller';
import { SearchController } from './presentation/controllers/search.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { NotificationsGateway } from './presentation/gateways/notifications.gateway';

// Cron
import { PromptSchedulerService } from './infrastructure/cron/prompt-scheduler.service';

// Repository Interfaces (for DI)
import { IUserRepository } from './domain/repositories/user.repository.interface';
import { IPromptRepository } from './domain/repositories/prompt.repository.interface';
import { IAudioRepository } from './domain/repositories/audio.repository.interface';
import { IRefreshTokenRepository } from './domain/repositories/refresh-token.repository.interface';
import { ICacheService } from './shared/interfaces/cache.interface';
import { IRateLimiterService } from './shared/interfaces/rate-limiter.interface';
import { IJobQueueService } from './shared/interfaces/job-queue.interface';
import { IWebSocketService } from './shared/interfaces/websocket.interface';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiration'),
        },
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    UserController,
    PromptController,
    AudioController,
    SubscriptionController,
    SearchController,
  ],
  providers: [
    // Infrastructure
    PrismaService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'IPromptRepository',
      useClass: PrismaPromptRepository,
    },
    {
      provide: 'IAudioRepository',
      useClass: PrismaAudioRepository,
    },
    {
      provide: 'IRefreshTokenRepository',
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: 'ICacheService',
      useClass: RedisCacheService,
    },
    {
      provide: 'IRateLimiterService',
      useClass: RedisRateLimiterService,
    },
    {
      provide: 'IJobQueueService',
      useClass: BullMQJobQueueService,
    },
    {
      provide: 'IWebSocketService',
      useClass: SocketIOWebSocketService,
    },
    // Repositories (concrete implementations - also provide as tokens)
    PrismaUserRepository,
    PrismaPromptRepository,
    PrismaAudioRepository,
    PrismaRefreshTokenRepository,
    RedisCacheService,
    RedisRateLimiterService,
    BullMQJobQueueService,
    SocketIOWebSocketService,
    // Application Services
    AuthService,
    UserService,
    PromptService,
    AudioService,
    SubscriptionService,
    SearchService,
    PromptProcessorService,
    // Presentation
    JwtStrategy,
    NotificationsGateway,
    // Cron
    PromptSchedulerService,
  ],
})
export class AppModule {}
