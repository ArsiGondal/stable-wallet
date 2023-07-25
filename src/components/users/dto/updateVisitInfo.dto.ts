import { ApiProperty } from '@nestjs/swagger';

export class UpdateVisitInfoDTO {
  @ApiProperty()
  appVersion: number;

  @ApiProperty()
  lastWebVisit: number;

  @ApiProperty()
  lastMobileVisit: number;

  @ApiProperty()
  OS: string;

  @ApiProperty()
  source: string;
}
