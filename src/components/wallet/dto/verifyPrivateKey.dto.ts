import { ApiProperty } from '@nestjs/swagger';

export class VerifyPrivateKeyDTO {
  @ApiProperty()
  privateKey: string;
}
