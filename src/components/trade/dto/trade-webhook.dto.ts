import { ApiProperty } from '@nestjs/swagger';

export class TradeWebhookDTO {
  @ApiProperty()
  data: string;
}
