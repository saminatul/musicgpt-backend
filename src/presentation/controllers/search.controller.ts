import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from '@application/services/search.service';
import { SearchResultDto } from '@application/dto/search.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiBearerAuth('bearer-token')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Unified search across users and audio' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchResultDto })
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
  async search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SearchResultDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.searchService.search(query, pageNum, limitNum);
  }
}
