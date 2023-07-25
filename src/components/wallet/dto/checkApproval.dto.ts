import { ApiProperty } from '@nestjs/swagger';

export class CheckApprovalDTO { 
  @ApiProperty()
  walletAddress:string;
 
  @ApiProperty()
  chainID: string;

  @ApiProperty()
  amount:string;


}
