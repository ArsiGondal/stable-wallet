import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './components/auth/auth.module';
import { CoinModule } from './components/coins/coin.module';
import { ContactsModule } from './components/contacts/contacts.module';
import { StakeModule } from './components/stake/stake.module';
import { StatsModule } from './components/stats/stats.module';
import { SwapModule } from './components/swap/swap.module';
import { TradeModule } from './components/trade/trade.module';
import { UsersModule } from './components/users/users.module';
import { WalletModule } from './components/wallet/wallet.module';
import { MediaUploadModule } from './file-management/media-upload/media-upload.module';
import { AnalyticsModule } from './components/analytics/analytics.module';
import { InfoModule } from './components/info/info.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    AuthModule.forRoot(),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 5,
    }),
    UsersModule,
    WalletModule,
    CoinModule,
    StakeModule,
    MediaUploadModule,
    TradeModule,
    SwapModule,
    ContactsModule,
    StatsModule,
    AnalyticsModule,
    InfoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
