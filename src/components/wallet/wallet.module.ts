import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AnalyticsService } from '../analytics/analytics.service';
import { DailyFundedSchema } from '../analytics/schema/dailtFunded.schema';
import { DailyFundedUserSchema } from '../analytics/schema/dailyFundedUser.schema';
import { DailyInvestmentSchema } from '../analytics/schema/dailyInvestment.schema';
import { DailyUsersSchema } from '../analytics/schema/dailyusers.schema';
import { DailyValuesSchema } from '../analytics/schema/dailyvalues.schema';
import { AuthModule } from '../auth/auth.module';
import { OtpSchema } from '../auth/schema/otp.schema';
import { CoinSchema } from '../coins/schema/coin.schema';
import { StakeSchema } from '../stake/schema/stake.schema';
import { RpcCallSchema } from '../stats/schema/rpc-call.schema';
import { StatsService } from '../stats/stats.service';
import { UserSchema } from '../users/schema/user.schema';
import { DecryptedWalletSchema } from './schema/decrypted-wallets.schema';
import { HistorySchema } from './schema/history.schema';
import { WalletSchema } from './schema/wallet.schema';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Wallet', schema: WalletSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Coin', schema: CoinSchema },
      { name: 'History', schema: HistorySchema },
      { name: 'Stake', schema: StakeSchema },
      { name: 'OTP', schema: OtpSchema },
      { name: 'rpcCall', schema: RpcCallSchema },
      { name: 'DecryptedWallets', schema: DecryptedWalletSchema },
    ]),
    AnalyticsModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, StatsService],
  exports: [WalletService],
})
export class WalletModule {}
