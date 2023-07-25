import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDTO {
  @ApiProperty()
  oldPassword: string;

  @ApiProperty()
  newPassword: string;
}
