import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinSchema } from '../coins/schema/coin.schema';
import { RpcCallSchema } from '../stats/schema/rpc-call.schema';
import { StatsService } from '../stats/stats.service';
import { UserSchema } from '../users/schema/user.schema';
import { WalletSchema } from '../wallet/schema/wallet.schema';
import { WalletModule } from '../wallet/wallet.module';
import { BridgeFeeSchema } from './schema/bridgeFee.schema';
import { SwapHistorySchema } from './schema/swapHistory.schema';
import { SwapController } from './swap.controller';
import { SwapService } from './swap.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SwapHistory', schema: SwapHistorySchema },
      { name: 'Wallet', schema: WalletSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Coin', schema: CoinSchema },
      { name: 'BridgeFee', schema: BridgeFeeSchema },
      {name:'rpcCall',schema:RpcCallSchema},
    ]),
    WalletModule,
  ],
  providers: [SwapService,StatsService],
  controllers: [SwapController],
})
export class SwapModule {}
