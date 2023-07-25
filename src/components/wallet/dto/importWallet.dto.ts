import { ApiProperty } from '@nestjs/swagger';

export class ImportWalletDTO {
  @ApiProperty()
  encryptionKey: string;

  @ApiProperty()
  privateKey: string;

  @ApiProperty()
  walletName: string;
}
