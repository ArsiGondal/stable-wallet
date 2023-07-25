import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinSchema } from '../coins/schema/coin.schema';
import { TradeHistorySchema } from './schema/trade-history.schema';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Trade', schema: TradeHistorySchema },
      { name: 'Coin', schema: CoinSchema },
    ]),
  ],
  controllers: [TradeController],
  providers: [TradeService],
})
export class TradeModule {}
