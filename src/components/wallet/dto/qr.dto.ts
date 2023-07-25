import { ApiProperty } from '@nestjs/swagger';

export class QRDTO {
  @ApiProperty()
  staticKey: string;
}
