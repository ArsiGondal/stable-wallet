import { ApiProperty } from '@nestjs/swagger';

export class AdminSignUpDTO {
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
}
