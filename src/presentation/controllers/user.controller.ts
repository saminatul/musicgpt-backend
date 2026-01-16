import { Controller, Get, Put, Param, Body, Query, UseGuards, UseInterceptors, ForbiddenException, Inject, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from '@application/services/user.service';
import { UpdateUserDto, UserResponseDto, PaginatedUserResponseDto } from '@application/dto/user.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';
import { IRateLimiterService } from '@shared/interfaces/rate-limiter.interface';
import { ConfigService } from '@nestjs/config';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { SubscriptionStatus } from '@domain/entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiBearerAuth('bearer-token')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('IRateLimiterService') private readonly rateLimiter: IRateLimiterService,
    private readonly configService: ConfigService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: PaginatedUserResponseDto })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string): Promise<PaginatedUserResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.userService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('Invalid UUID') })) id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }

  @Get('rate-limit/status')
  @ApiOperation({ summary: 'Check current rate limit status for authenticated user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Rate limit status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        remaining: { type: 'number', example: 15 },
        limit: { type: 'number', example: 20 },
        resetAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
        windowMs: { type: 'number', example: 60000 },
        subscriptionStatus: { type: 'string', example: 'FREE' },
        tier: { type: 'string', example: 'FREE' },
      }
    }
  })
  async getRateLimitStatus(@CurrentUser() user: any) {
    const userEntity = await this.userRepository.findById(user.id);
    if (!userEntity) {
      throw new ForbiddenException('User not found');
    }

    const isPaid = userEntity.subscriptionStatus === SubscriptionStatus.PAID;
    const limit = isPaid
      ? this.configService.get<number>('rateLimit.paidTier')
      : this.configService.get<number>('rateLimit.freeTier');
    const windowMs = this.configService.get<number>('rateLimit.windowMs');

    const identifier = `user:${user.id}`;
    const status = await this.rateLimiter.getStatus(identifier, limit, windowMs);

    return {
      ...status,
      subscriptionStatus: userEntity.subscriptionStatus,
      tier: isPaid ? 'PAID' : 'FREE',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 403, description: 'Unauthorized to update this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('Invalid UUID') })) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any): Promise<UserResponseDto> {
    // Only allow users to update their own profile
    if (user.id !== id) {
      throw new ForbiddenException('Unauthorized to update this user');
    }
    return this.userService.update(id, dto);
  }
}
