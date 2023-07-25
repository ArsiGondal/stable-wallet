import { ApiProperty } from '@nestjs/swagger';

export class EncryptionKeyDTO {
  @ApiProperty()
  encryptionKey: string;
}
