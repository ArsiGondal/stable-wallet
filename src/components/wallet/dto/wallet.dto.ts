import { ApiProperty } from '@nestjs/swagger';

export class WalletDTO {
  @ApiProperty()
  walletAddress: string;

  @ApiProperty()
  privateKey: string;

  @ApiProperty()
  userID: string;

  @ApiProperty()
  walletName: string;
}
