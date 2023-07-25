import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { start } from 'repl';
import { AnalyticsService } from './analytics.service';
import { FundStatus } from './enum/funded.enum';
import { InvestmentNetwork } from './enum/investmentNetwork.enum';
import { Network } from './enum/network.enum';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private _analyticsService: AnalyticsService) {}

  @Get('getUsersCount/:date')
  getUsersCount(@Param('date') date: number) {
    return this._analyticsService.getUsersCount(date);
  }

  @Get('getAllCountsFrom/:date')
  getAllCountsFrom(@Param('date') date: number) {
    return this._analyticsService.getAllCountsFrom(date);
  }

  @Get('getCountsFrom/:date')
  getCountsFrom(@Param('date') date: number) {
    return this._analyticsService.getCountsFrom(date);
  }

  @Get('getAndUpdateUserData')
  getAndUpdateUserData() {
    return this._analyticsService.getAndUpdateUserData();
  }

  @Get('getUserWhoInvestedInAll')
  getUserWhoInvestedInAll() {
    return this._analyticsService.getUserWhoInvestedInAll();
  }

  @ApiQuery({
    name: 'network',
    enum: Network,
  })
  @ApiQuery({
    name: 'funded',
    enum: FundStatus,
  })
  @ApiQuery({
    name: 'startDate',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    type: Number,
    required: false,
  })
  @Get('getUsersForTable')
  getUsersForTable(
    @Query('offset') offset: number = 0,
    @Query('limit') limit: number = 10,
    @Query('network') network: string = Network.all,
    @Query('funded') funded: string = FundStatus.all,
    @Query('startDate') startDate: number = 0,
    @Query('endDate') endDate: number = Date.now(),
  ) {
    return this._analyticsService.getUsersForTable(
      offset,
      limit,
      network,
      funded,
      startDate,
      endDate,
    );
  }

  @ApiQuery({
    name: 'network',
    enum: Network,
  })
  @ApiQuery({
    name: 'funded',
    enum: FundStatus,
  })
  @ApiQuery({
    name: 'startDate',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'endDate',
    type: Number,
    required: false,
  })
  @Get('getStakingUsersForTable')
  getStakingUsersForTable(
    @Query('offset') offset: number = 0,
    @Query('limit') limit: number = 10,
    @Query('network') network: string = Network.all,
    @Query('funded') funded: string = FundStatus.all,
    @Query('startDate') startDate: number = 0,
    @Query('endDate') endDate: number = Date.now(),
  ) {
    return this._analyticsService.getStakingUsersForTable(
      offset,
      limit,
      network,
      funded,
      startDate,
      endDate,
    );
  }

  @ApiQuery({
    name: 'network',
    enum: InvestmentNetwork,
  })
  @ApiQuery({
    name: 'startDate',
    type: Number,
    required: false,
  })
  @Get('updateInvestmentDataForOneDay')
  updateInvestmentDataForOneDay(
    @Query('network') network: string = InvestmentNetwork.matic,
    @Query('startDate') startDate: number,
  ) {
    return this._analyticsService.updateInvestmentDataForOneDay(
      startDate,
      network,
    );
  }

  @ApiQuery({
    name: 'network',
    enum: InvestmentNetwork,
  })
  @ApiQuery({
    name: 'date',
    type: Number,
    required: false,
  })
  @Get('getTotalInvestmentData')
  getTotalInvestmentData(
    @Query('network') network: string = InvestmentNetwork.matic,
    @Query('date') date: number,
  ) {
    return this._analyticsService.getTotalInvestmentData(date, network);
  }

  @ApiQuery({
    name: 'date',
    type: Number,
    required: false,
  })
  @Get('updateAllInvestmentsFrom')
  updateAllInvestmentsFrom(@Query('date') date: number) {
    return this._analyticsService.updateAllInvestmentsFrom(date);
  }

  @ApiQuery({
    name: 'network',
    enum: InvestmentNetwork,
  })
  @ApiQuery({
    name: 'date',
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: 'address',
    type: String,
    required: false,
  })
  @Get('getDailyNewAmountFunded')
  getDailyNewAmountFunded(
    @Query('network') network: string = InvestmentNetwork.matic,
    @Query('date') date: number,
    @Query('address') address: number,
  ) {
    return this._analyticsService.getDailyNewAmountFunded(
      date,
      network,
      address,
    );
  }

  @ApiQuery({
    name: 'date',
    type: Number,
    required: false,
  })
  @Get('updateDailyNewAmountFunded')
  updateDailyNewAmountFunded(@Query('date') date: number) {
    return this._analyticsService.updateDailyNewAmountFunded(date);
  }

  @ApiQuery({
    name: 'network',
    enum: Network,
  })
  @ApiQuery({
    name: 'funded',
    enum: FundStatus,
  })
  @ApiQuery({
    name: 'startDate',
    type: Number,
    required: false,
  })
  @Get('getUserTableForDailyFunded')
  getUserTableForDailyFunded(
    @Query('offset') offset: number = 0,
    @Query('limit') limit: number = 10,
    @Query('network') network: string = Network.all,
    @Query('funded') funded: string = FundStatus.all,
    @Query('startDate') startDate: number = 0,
  ) {
    return this._analyticsService.getUserTableForDailyFunded(
      offset,
      limit,
      network,
      funded,
      startDate,
    );
  }

  @ApiQuery({
    name: 'date',
    type: Number,
    required: false,
  })
  @Get('updateDailyCompounded')
  updateDailyCompounded(@Query('date') date: number) {
    return this._analyticsService.updateDailyCompounded(date);
  }

  @ApiQuery({
    name: 'network',
    enum: Network,
  })
  @ApiQuery({
    name: 'funded',
    enum: FundStatus,
  })
  @ApiQuery({
    name: 'startDate',
    type: Number,
    required: false,
  })
  @Get('updateCount')
  updateCount(
    @Query('network') network: string = Network.all,
    @Query('funded') funded: string = FundStatus.all,
    @Query('startDate') startDate: number = 0,
  ) {
    return this._analyticsService.updateCount(network, funded, startDate);
  }
}
