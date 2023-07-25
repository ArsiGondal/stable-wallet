import { ApiProperty } from '@nestjs/swagger';

export class InfoDTO {
  @ApiProperty()
  latestAppVersion: number;

  @ApiProperty()
  message: string;
}
