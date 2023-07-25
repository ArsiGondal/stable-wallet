import { ApiProperty } from '@nestjs/swagger';

export class ProviderLoginDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  providerID: string;

  @ApiProperty()
  provider: string;
}
