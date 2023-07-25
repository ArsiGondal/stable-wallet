import { ApiProperty } from '@nestjs/swagger';

export class OtpDTO {
  @ApiProperty()
  userID: string;

  @ApiProperty()
  expiryTime: number;
}
