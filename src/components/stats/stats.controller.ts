import { Controller, Get, Param, Query, } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Networks } from './enum/network.enum';
import { TIME_PERIOD_ENUM } from './enum/time.enum';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
    constructor(private _statsService:StatsService){}

    @ApiQuery({
        name:'network',
        enum:Networks,
        required:false,
    })
    @ApiQuery({
        name:'startDate',
        type:Number,
        required:false,
    })
    @ApiQuery({
        name:'endDate',
        type:Number,
        required:false,
    })
    @ApiQuery({
        name:'timeperiod',
        enum:TIME_PERIOD_ENUM,
        required:false,
    })
    @Get('getRpcData')
    getRpcData(
        @Query('startDate') startDate:number = 0,
        @Query('endDate') endDate:number,
        @Query('network') network:Networks,
        @Query('timeperiod') timeperiod:number=0,
    ){
        return this._statsService.getRpcData(startDate,endDate,network,timeperiod)
    }
}
