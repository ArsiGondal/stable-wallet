import { ApiProperty } from '@nestjs/swagger';

export class EmailProviderDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  provider: string;
}
