import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StakeService } from './stake.service';

@ApiTags('Stake')
@Controller('stake')
export class StakeController {
  constructor(private _stakeService: StakeService) {}

  @Get('updateTotalInvestment')
  updateTotalInvestment() {
    return this._stakeService.update();
  }

  @Get('getStakeData')
  getStakeData() {
    return this._stakeService.getStakeData();
  }

  @Get('getFaq')
  getFaq() {
    return this._stakeService.getFaq();
  }

  @Get('getTotalReward')
  getTotlaReward() {
    return this._stakeService.getTotalReward();
  }
}
