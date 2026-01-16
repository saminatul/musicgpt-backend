import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty()
  users: {
    data: Array<{
      id: string;
      email: string;
      displayName: string;
      subscriptionStatus: string;
    }>;
    meta: {
      nextCursor?: string;
    };
  };

  @ApiProperty()
  audio: {
    data: Array<{
      id: string;
      promptId: string;
      userId: string;
      title: string;
      url: string;
    }>;
    meta: {
      nextCursor?: string;
    };
  };
}
