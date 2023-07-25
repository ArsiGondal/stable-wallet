import { ApiProperty } from '@nestjs/swagger';

export class StakeDTO {
  @ApiProperty()
  totalInvestment: number;
}
