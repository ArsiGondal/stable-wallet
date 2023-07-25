import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDTO {
  @ApiProperty()
  firstname: string;

  @ApiProperty()
  lastname: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  profileImageURL: string;

  @ApiProperty()
  isTwoFactorEnabled: boolean;
}
