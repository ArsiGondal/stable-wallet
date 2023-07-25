import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletSchema } from '../wallet/schema/wallet.schema';
import { UserSchema } from './schema/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: UserSchema },
  { name: 'Wallet', schema: WalletSchema },
])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
