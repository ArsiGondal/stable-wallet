import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinController } from './coin.controller';
import { CoinService } from './coin.service';
import { CoinSchema } from './schema/coin.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Coin', schema: CoinSchema }])],
  controllers: [CoinController],
  providers: [CoinService],
})
export class CoinModule {}
