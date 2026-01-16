import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromptDto {
  @ApiProperty({ example: 'Generate a relaxing jazz melody' })
  @IsString()
  @MinLength(1)
  text: string;
}

export class PromptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'COMPLETED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedPromptResponseDto {
  @ApiProperty({ type: [PromptResponseDto] })
  data: PromptResponseDto[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
