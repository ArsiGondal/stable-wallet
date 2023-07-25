import { ApiProperty } from '@nestjs/swagger';

export class SwapDTO {
  @ApiProperty()
  fromChainId: string;

  @ApiProperty()
  toChainId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  slippageTolerance: number;
}
