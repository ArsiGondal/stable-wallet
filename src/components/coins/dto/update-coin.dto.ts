import { ApiProperty } from '@nestjs/swagger';

export class UpdateCoinDTO {
  @ApiProperty()
  priceInUSD: number;

  @ApiProperty()
  priceInEUR: number;

  @ApiProperty()
  priceChangePercentage: number;

  @ApiProperty()
  chainID: string;

  @ApiProperty()
  coinName: number;

  @ApiProperty()
  imageURL: string;

  @ApiProperty()
  isStakingAvailable: boolean;

  @ApiProperty()
  isSwapAvailable: boolean;

  @ApiProperty()
  isTradeAvailable: boolean;

  @ApiProperty()
  chainIDString: string;

  @ApiProperty()
  isToken: boolean;

  @ApiProperty()
  contract: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  sendText: string;
}
