import { ApiProperty } from '@nestjs/swagger';

export class InvestAmountDTO {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  amountInWei: string;

  
  @ApiProperty()
  chainID: string;

  @ApiProperty()
  gasLimit:number;

  @ApiProperty()
  gasPrice: number;
}
