import { ApiProperty } from '@nestjs/swagger';

export class SendAmountDTOV2 {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletID: string;

  @ApiProperty()
  receiverAddress: string;

  @ApiProperty()
  amount: string;

  @ApiProperty()
  chainID: string;

  @ApiProperty()
  gasLimit:number;

  @ApiProperty()
  gasPrice: number;
}
