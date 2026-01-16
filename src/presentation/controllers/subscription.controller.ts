import { Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from '@application/services/subscription.service';
import { SubscriptionResponseDto } from '@application/dto/subscription.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiBearerAuth('bearer-token')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('subscribe')
  @ApiOperation({ 
    summary: 'Subscribe to paid tier',
    description: 'Upgrades the authenticated user to PAID tier. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiResponse({ status: 200, description: 'Subscription activated', type: SubscriptionResponseDto })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Authorization Bearer token is required' }
      }
    }
  })
  async subscribe(@CurrentUser() user: any): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.subscribe(user.id);
  }

  @Post('cancel')
  @ApiOperation({ 
    summary: 'Cancel subscription',
    description: 'Downgrades the authenticated user to FREE tier. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiResponse({ status: 200, description: 'Subscription cancelled', type: SubscriptionResponseDto })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Missing or invalid Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Authorization Bearer token is required' }
      }
    }
  })
  async cancel(@CurrentUser() user: any): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancel(user.id);
  }
}
