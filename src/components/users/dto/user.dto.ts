import { ApiProperty } from '@nestjs/swagger';

export class UserDTO {
  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  profileImageURL: string;

  @ApiProperty({
    example: [
      {
        providerName: '',
        providerID: '',
      }
    ],
  })
  provider: any[];

  @ApiProperty()
  ref: string;

  @ApiProperty()
  recaptchaToken: string;
}
