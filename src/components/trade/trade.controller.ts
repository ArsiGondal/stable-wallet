import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TradeWebhookDTO } from './dto/trade-webhook.dto';
import { TradeService } from './trade.service';

@ApiTags('Trade')
@Controller('trade')
export class TradeController {
    constructor(private _tradeService:TradeService){}

    @Post('tradeWebhook')
    tradeWebhook(@Body() data:TradeWebhookDTO){
        return this._tradeService.tradeWebhook(data);
    }

    @Get('getTradeHistory/:walletAddress')
    getTradeHistory(@Param('walletAddress') walletAddress:string,  @Query("offset") offset: number = 0,@Query("limit") limit: number = 10,){
        return this._tradeService.getTradeHistory(walletAddress,offset,limit);
    }
    
    @Get('getTradeByOrderID/:orderID')
    getTradeByOrderID(@Param('orderID') orderID:string){
        return this._tradeService.getTradeByOrderID(orderID);
    }

    @Get('getTradeByID/:id')
    getTradeByID(@Param('id') id:string){
        return this._tradeService.getTradeByID(id);
    }

    @Get('getLatestTrade/:walletAddress')
    getLatestTrade(@Param('walletAddress') walletAddress:string){
        return this._tradeService.getLatestTrade(walletAddress);
    }
}
