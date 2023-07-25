import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDTO {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  walletName: string;
}
