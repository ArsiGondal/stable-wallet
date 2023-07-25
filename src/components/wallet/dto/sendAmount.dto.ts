import { ApiProperty } from '@nestjs/swagger';

export class SendAmountDTO {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  receiverAddress: string;

  @ApiProperty()
  amountInWei: string;

  @ApiProperty()
  chainID: string;

  @ApiProperty()
  gasLimit:number;

  @ApiProperty()
  gasPrice: number;
}
