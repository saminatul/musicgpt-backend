import { Controller, Get, Put, Param, Body, Query, UseGuards, UseInterceptors, ForbiddenException, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AudioService } from '@application/services/audio.service';
import { UpdateAudioDto, AudioResponseDto, PaginatedAudioResponseDto } from '@application/dto/audio.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Audio')
@Controller('audio')
@UseGuards(JwtAuthGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiBearerAuth('bearer-token')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get your audio files (paginated)',
    description: 'Returns audio files for the authenticated user. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Audio retrieved successfully', type: PaginatedAudioResponseDto })
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
  async findAll(@CurrentUser() user: any, @Query('page') page?: string, @Query('limit') limit?: string): Promise<PaginatedAudioResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.audioService.findByUserId(user.id, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get audio by ID (only own audio)',
    description: 'Returns audio file if it belongs to the authenticated user. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiResponse({ status: 200, description: 'Audio retrieved successfully', type: AudioResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Audio not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your audio' })
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
  async findById(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('Invalid UUID') })) id: string, @CurrentUser() user: any): Promise<AudioResponseDto> {
    return this.audioService.findById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update audio (only own audio)',
    description: 'Updates audio file if it belongs to the authenticated user. User ID is automatically extracted from JWT token. Requires Bearer token authentication.'
  })
  @ApiResponse({ status: 200, description: 'Audio updated successfully', type: AudioResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Audio not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your audio' })
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
  async update(@Param('id', new ParseUUIDPipe({ exceptionFactory: () => new BadRequestException('Invalid UUID') })) id: string, @Body() dto: UpdateAudioDto, @CurrentUser() user: any): Promise<AudioResponseDto> {
    return this.audioService.update(id, dto, user.id);
  }
}
