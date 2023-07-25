import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDTO {
  @ApiProperty()
  otp: string;

  @ApiProperty()
  encryptionKey: string;
}
