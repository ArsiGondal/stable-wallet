import { ApiProperty } from '@nestjs/swagger';

export class CalculateProfitDTO {
  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  chainID: string;
}
