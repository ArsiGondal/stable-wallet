import { ApiProperty } from '@nestjs/swagger';

export class RecaptchaDTO {
  @ApiProperty()
  recaptchaToken: string;
}
