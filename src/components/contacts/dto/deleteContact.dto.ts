import { ApiProperty } from '@nestjs/swagger';

export class DeleteContactDTO {
  @ApiProperty()
  contactAddress: string;
}
