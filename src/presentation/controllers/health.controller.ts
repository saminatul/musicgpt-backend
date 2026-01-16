import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { ICacheService } from '@shared/interfaces/cache.interface';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject('ICacheService') private readonly cacheService: ICacheService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async health() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>('NODE_ENV') || 'development',
      version: '1.0.0',
      checks: {
        database: 'unknown',
        cache: 'unknown',
      },
    };

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.checks.database = 'healthy';
    } catch (error) {
      checks.checks.database = 'unhealthy';
      checks.status = 'degraded';
    }

    // Check cache connection
    try {
      // Try to set and get a test key
      await this.cacheService.set('health-check-test', 'ok', 1);
      await this.cacheService.get('health-check-test');
      checks.checks.cache = 'healthy';
    } catch (error) {
      checks.checks.cache = 'unhealthy';
      checks.status = 'degraded';
    }

    // If any check failed, return 503
    const statusCode = checks.status === 'ok' ? 200 : 503;

    return {
      ...checks,
      httpStatus: statusCode,
    };
  }

  @Public()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe - indicates if the service is running' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe - indicates if the service is ready to accept traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness() {
    const checks = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        cache: false,
      },
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.checks.database = true;
    } catch (error) {
      checks.checks.database = false;
      checks.status = 'not ready';
    }

    // Check cache
    try {
      await this.cacheService.set('health-check-test', 'ok', 1);
      await this.cacheService.get('health-check-test');
      checks.checks.cache = true;
    } catch (error) {
      checks.checks.cache = false;
      checks.status = 'not ready';
    }

    const statusCode = checks.status === 'ready' ? 200 : 503;

    return {
      ...checks,
      httpStatus: statusCode,
    };
  }
}
