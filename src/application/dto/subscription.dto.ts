import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionResponseDto {
  @ApiProperty({ enum: ['FREE', 'PAID'] })
  subscriptionStatus: string;

  @ApiProperty()
  message: string;
}
