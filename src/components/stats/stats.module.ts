import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RpcCallSchema } from './schema/rpc-call.schema';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports:[
    MongooseModule.forFeature([
      {name:'rpcCall',schema:RpcCallSchema},
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports:[StatsService],
})
export class StatsModule {}
