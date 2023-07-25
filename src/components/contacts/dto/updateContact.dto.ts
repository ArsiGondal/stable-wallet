import { ApiProperty } from '@nestjs/swagger';

export class UpdateContactDTO {
  @ApiProperty()
  contactAddress: string;

  @ApiProperty()
  contactName: string;
}
