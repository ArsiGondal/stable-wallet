import { ApiProperty } from '@nestjs/swagger';

export class TransactionStatusDTO {
  @ApiProperty()
  txHash: string;

  @ApiProperty()
  networkId: number;
}
