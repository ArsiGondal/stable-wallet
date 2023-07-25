import { ApiProperty } from '@nestjs/swagger';

export class SendSwapDTO {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  fromChainId: string;

  @ApiProperty()
  toChainId: string;
}
