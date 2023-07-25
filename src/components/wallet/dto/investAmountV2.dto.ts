import { ApiProperty } from '@nestjs/swagger';

export class InvestAmountDTOV2 {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  chainID: string;

  @ApiProperty()
  gasLimit:number;

  @ApiProperty()
  gasPrice: number;
}