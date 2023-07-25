import { ApiProperty } from '@nestjs/swagger';

export class BridgeFeeDTO {
  @ApiProperty()
  srcChainId: string;

  @ApiProperty()
  destChainId: string;
}
