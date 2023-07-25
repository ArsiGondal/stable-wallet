import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSchema } from '../users/schema/admin.schema';
import { UserSchema } from '../users/schema/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { OtpSchema } from './schema/otp.schema';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '9999999999s' },
        }),
        MongooseModule.forFeature([
          { name: 'User', schema: UserSchema },
          { name: 'Admin', schema: AdminSchema },
          { name: 'Otp', schema: OtpSchema },
        ]),
      ],
      controllers: [AuthController],
      providers: [AuthService, JwtStrategy],
      module: AuthModule,
    };
  }
}
