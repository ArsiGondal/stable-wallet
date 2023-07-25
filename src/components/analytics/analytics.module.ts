import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../users/schema/user.schema';
import { WalletSchema } from '../wallet/schema/wallet.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CountSchema } from './schema/count.schema';
import { DailyFundedSchema } from './schema/dailtFunded.schema';
import { DailyCompoundedSchema } from './schema/dailyCompunded.schema';
import { DailyFundedUserSchema } from './schema/dailyFundedUser.schema';
import { DailyInvestmentSchema } from './schema/dailyInvestment.schema';
import { DailyUsersSchema } from './schema/dailyusers.schema';
import { DailyValuesSchema } from './schema/dailyvalues.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'dailyusers', schema: DailyUsersSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Wallet', schema: WalletSchema },
      { name: 'dailyValuesCount', schema: DailyValuesSchema },
      { name: 'dailyInvestment', schema: DailyInvestmentSchema },
      { name: 'dailyFunded', schema: DailyFundedSchema },
      { name: 'dailyFundedUser', schema: DailyFundedUserSchema },
      { name: 'dailyCompunded', schema: DailyCompoundedSchema },
      { name: 'Count', schema: CountSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
