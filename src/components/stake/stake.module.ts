import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RpcCallSchema } from '../stats/schema/rpc-call.schema';
import { StatsService } from '../stats/stats.service';
import { StakeSchema } from './schema/stake.schema';
import { StakeController } from './stake.controller';
import { StakeService } from './stake.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Stake', schema: StakeSchema },
    { name: 'rpcCall', schema: RpcCallSchema },

    ]),
  ],
  controllers: [StakeController],
  providers: [StakeService,StatsService],
})
export class StakeModule { }
