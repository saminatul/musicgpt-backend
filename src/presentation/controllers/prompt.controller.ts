import { Controller, Post, Get, Param, Body, Query, UseGuards, UseInterceptors, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PromptService } from '@application/services/prompt.service';
import { CreatePromptDto, PromptResponseDto } from '@application/dto/prompt.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Prompts')
@Controller('prompts')
@UseGuards(JwtAuthGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiBearerAuth('bearer-token')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new prompt',
    description: 'Creates a prompt for the authenticated user. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiResponse({ status: 201, description: 'Prompt created successfully', type: PromptResponseDto })
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
  async create(@Body() dto: CreatePromptDto, @CurrentUser() user: any): Promise<PromptResponseDto> {
    return this.promptService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get prompt by ID (only own prompts)',
    description: 'Returns prompt if it belongs to the authenticated user. Requires Bearer token authentication.'
  })
  @ApiResponse({ status: 200, description: 'Prompt retrieved successfully', type: PromptResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your prompt' })
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
  async findById(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('Invalid UUID') })) id: string, @CurrentUser() user: any): Promise<PromptResponseDto> {
    return this.promptService.findById(id, user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get your prompts (paginated)',
    description: 'Returns prompts for the authenticated user. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Prompts retrieved successfully' })
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
  async findByUserId(@CurrentUser() user: any, @Query('page') page?: string, @Query('limit') limit?: string): Promise<any> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.promptService.findByUserId(user.id, pageNum, limitNum);
  }
}
