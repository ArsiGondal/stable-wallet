import { ApiProperty } from '@nestjs/swagger';

export class VerifyDTO {
  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  code: string;
}
