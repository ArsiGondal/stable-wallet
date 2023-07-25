import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoinService } from './coin.service';
import { CoinDTO } from './dto/coin.dto';
import { UpdateCoinDTO } from './dto/update-coin.dto';

@ApiTags('Coin')
@Controller('coin')
export class CoinController {
  constructor(private _coinService: CoinService) {}

  @Post('addCoin')
  addCoin(@Body() coinDto: CoinDTO) {
    return this._coinService.addCoin(coinDto);
  }

  @Get('getCoins')
  getCoins() {
    return this._coinService.getCoins();
  }

  @Get('getCoin/:name')
  getCoin(@Param('name') name: string) {
    return this._coinService.getCoin(name);
  }

  @Get('getCoinsWithSparkline')
  getCoinsWithSparkline() {
    return this._coinService.getCoinsWithSparkline();
  }

  @Post('updateCoin/:name')
  updateCoin(
    @Body() updateCoinDto: UpdateCoinDTO,
    @Param('name') name: string,
  ) {
    return this._coinService.updateCoin(updateCoinDto, name);
  }

  @Get('updateCoins')
  updateCoins() {
    return this._coinService.updateCoins();
  }

  @Get('getCoinByChainID/:chainID')
  getCoinByChainID(@Param('chainID') chainID: number) {
    return this._coinService.getCoinByChainID(chainID);
  }
}
