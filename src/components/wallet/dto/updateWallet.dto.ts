import { ApiProperty } from '@nestjs/swagger';

export class UpdateWalletNameDTO {
  @ApiProperty()
  walletName: string;
}
