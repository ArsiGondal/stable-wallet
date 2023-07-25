import { ApiProperty } from '@nestjs/swagger';

export class ContactDTO {
  @ApiProperty()
  contactName: string;

  @ApiProperty()
  contactAddress: string;
}
