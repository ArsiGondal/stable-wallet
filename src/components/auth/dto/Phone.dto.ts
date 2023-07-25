import { ApiProperty } from '@nestjs/swagger';

export class PhoneDTO {
  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  recaptchaToken: string;
}
