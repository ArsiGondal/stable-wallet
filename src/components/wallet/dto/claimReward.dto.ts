import { ApiProperty } from '@nestjs/swagger';

export class ClaimRewardDTO {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  chainID: string;

  @ApiProperty()
  gasLimit:number;

  @ApiProperty()
  gasPrice: number;
}
