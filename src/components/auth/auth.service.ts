import {
  BadRequestException,
  Body,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/interface/user.interface';
import * as bcrypt from 'bcrypt';
import * as moment from 'moment';
import { Twilio } from 'twilio';
import { VerifyDTO } from './dto/Verify.dto';
import { Otp } from './interface/otp.interface';
import { PhoneDTO } from './dto/Phone.dto';
import { UserDTO } from '../users/dto/user.dto';
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { ProviderLoginDTO } from './dto/ProviderLogin.dto';
import { Admin } from '../users/interface/admin.interface';
import { RecaptchaDTO } from './dto/Recaptcha.dto';
import axios from 'axios';

@Injectable()
export class AuthService {
  private twilioClient: Twilio;

  constructor(
    private jwtService: JwtService,
    @InjectModel('User') private _userModel: Model<User>,
    @InjectModel('Admin') private _adminModel: Model<Admin>,
    @InjectModel('Otp') private _otpModel: Model<Otp>,
  ) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_ID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async signup(userDto) {
    try {
      let user: User;
      if (userDto.email) {
        user = await this._userModel.findOne({
          email: userDto.email.toLowerCase(),
        });
        if (user && user.isVerified) {
          throw new ForbiddenException('Email already exists!');
        }

        if (user && !user.isVerified) {
          await this._userModel.deleteOne({
            email: userDto.email.toLowerCase(),
          });
        }

        userDto.email = userDto.email.toLowerCase();
      }
      if (userDto.phoneNumber) {
        user = await this._userModel.findOne({
          phoneNumber: userDto.phoneNumber,
        });

        if (user && user.isVerified) {
          throw new ForbiddenException('Phone Number already exists!');
        }

        if (user && !user.isVerified) {
          await this._userModel.deleteOne({
            phoneNumber: userDto.phoneNumber,
          });
        }
      }

      userDto._id = await new Types.ObjectId().toHexString();

      let userData = await new this._userModel(userDto).save();

      userData = JSON.parse(JSON.stringify(userData));
      delete userData.password;

      await this.sendOtp({...userData,recaptchaToken:userDto?.recaptchaToken});

      return {
        userData,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async signupWithProvider(userDto) {
    try {
      let user: User;
      if (userDto.email) {
        user = await this._userModel.findOne({
          email: userDto.email.toLowerCase(),
        });
        if (user && user.isVerified) {
          throw new ForbiddenException(`Account already exist`);
        }

        if (user && !user.isVerified) {
          await this._userModel.deleteOne({
            email: userDto.email.toLowerCase(),
          });
        }

        userDto.email = userDto.email.toLowerCase();
      }
      if (userDto.phoneNumber) {
        user = await this._userModel.findOne({
          phoneNumber: userDto.phoneNumber,
        });

        if (user && user.isVerified) {
          throw new ForbiddenException('Phone Number already exists!');
        }

        if (user && !user.isVerified) {
          await this._userModel.deleteOne({
            phoneNumber: userDto.phoneNumber,
          });
        }
      }

      userDto._id = await new Types.ObjectId().toHexString();

      userDto.password = '';

      let userData = await new this._userModel(userDto).save();

      userData = JSON.parse(JSON.stringify(userData));
      delete userData.password;

      await this.sendOtp({...userData,recaptchaToken:userDto?.recaptchaToken});

      return {
        userData,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async linkAccountWithProvider(loginDto) {
    try {
      let user = await this._userModel.findOne({ email: loginDto?.email });

      if (!user) {
        throw new UnauthorizedException('Invalid email');
      }

      if (!user && user.isVerified) {
        throw new Error('No user record against this email');
      }

      if (
        user &&
        user.provider?.includes(
          (item) => item?.providerName == loginDto?.provider,
        )
      ) {
        throw new Error(
          `User account is already linked with ${loginDto?.provider} provider`,
        );
      }
      let providers = user?.provider?.length ? user?.provider : [];

      providers.push({
        providerName: loginDto?.provider,
        providerID: loginDto?.providerID,
      });

      const updated = await this._userModel.updateOne(
        { _id: user?.id },
        {
          password: '',
          provider: providers,
        },
      );

      user = await this._userModel.findOne({ email: loginDto?.email });

      user = JSON.parse(JSON.stringify(user));
      delete user.password;

      const token = await this.generateToken(user);
      return { user, token };
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(err.message);
    }
  }

  async sendOtp(userDto) {
    try {
      console.log(userDto);
      const isUser = await this._userModel.findOne({
        phoneNumber: userDto?.phoneNumber,
      });

      const recaptchaRes = await this.verifyRecaptcha({ recaptchaToken: userDto?.recaptchaToken });

      if (!recaptchaRes?.success) {
        console.log('Invalid captcha token')
        // throw new Error('Invalid captcha token')
      }

      if (!isUser) {
        throw new BadRequestException("Phone number doesn't exist");
      }

      const verificationCodeTime = moment().add(10, 'minutes').unix();
      const sendValue = await this.twilioClient.verify
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: userDto.phoneNumber,
          channel: 'sms',
          locale: 'en',
        });

      console.log({ sendValue });

      return {
        message: 'Otp is sent. Please verify your account',
      };
    } catch (err) {
      console.log(err);
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async resendOtp(phoneDto) {
    try {
      const user = await this._userModel.findOne({
        phoneNumber: phoneDto.phoneNumber,
      });
      if (!user) {
        throw new BadRequestException('Invalid phone number');
      }

      // if (user.isVerified) {
      //   throw new BadRequestException('Already verified');
      // }

      const verificationCodeTime = moment().add(10, 'minutes').unix();
      const sendValue = await this.twilioClient.verify
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phoneDto.phoneNumber,
          channel: 'sms',
          locale: 'en',
        });

      console.log({ sendValue });

      return {
        message: 'Otp is sent. Please verify your account',
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async verifyOtp(verifyDto: VerifyDTO) {
    try {
      let user = await this._userModel.findOne({
        phoneNumber: verifyDto.phoneNumber,
      });

      console.log(verifyDto);

      if (!user) {
        throw new HttpException(
          'Incorrect phone number',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.twilioClient.verify
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: verifyDto.phoneNumber,
          code: verifyDto.code,
        });

      console.log(result);

      if (result.status === 'expired') {
        throw new HttpException('expired', HttpStatus.UNAUTHORIZED);
      } else if (!result.valid || result.status !== 'approved') {
        throw new HttpException('wrong code provided', HttpStatus.UNAUTHORIZED);
      }

      user = JSON.parse(JSON.stringify(user));
      delete user.password;

      const token = await this.generateToken(user);

      if (!user.isVerified) {
        await this._userModel.updateOne(
          {
            phoneNumber: verifyDto.phoneNumber,
          },
          {
            isVerified: true,
          },
        );
      }

      user = await this._userModel.findOne({ _id: user.id });
      delete user.password;

      return {
        status: result.status,
        user,
        ...token,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async login(loginDto) {
    try {
      loginDto.email = loginDto.email.toLowerCase();
      let user = await this._userModel.findOne({
        email: loginDto.email,
        isVerified: true,
      });
      if (!user) {
        throw new UnauthorizedException('Invalid email');
      }

      if (await bcrypt.compare(loginDto.password, user.password)) {
        user = JSON.parse(JSON.stringify(user));
        delete user.password;
        // const token = await this.generateToken(user);

        user = JSON.parse(JSON.stringify(user));
        delete user.password;

        const token = await this.generateToken(user);
        return { user, token };
      } else {
        throw new UnauthorizedException('Incorrect credentials');
      }
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(err.message);
    }
  }

  async loginForMimiBro(loginDto) {
    try {
      loginDto.email = loginDto.email.toLowerCase();
      let user: any = await this._userModel.findOne({
        email: loginDto.email,
        isVerified: true,
      });
      if (!user) {
        throw new UnauthorizedException('Invalid email');
      }

      if (await bcrypt.compare(loginDto.password, user.password)) {
        user = await this._userModel.aggregate([
          {
            $match: {
              email: loginDto.email,
              isVerified: true,
            },
          },
          {
            $lookup: {
              from: 'wallet',
              as: 'wallets',
              localField: '_id',
              foreignField: 'userID',
              pipeline: [{ $project: { walletName: 1, walletAddress: 1 } }],
            },
          },
        ]);

        if (!user[0]?.wallets?.length) {
          throw new Error('Must create or import wallet first!');
        }

        user = JSON.parse(JSON.stringify(user[0]));
        delete user.password;

        const token = await this.generateToken(user);
        return { user, token };
      } else {
        throw new UnauthorizedException('Incorrect credentials');
      }
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(err.message);
    }
  }

  async loginWithProvider(providerLoginDTO: ProviderLoginDTO) {
    try {
      let user = await this._userModel.findOne({
        email: providerLoginDTO?.email,
      });
      if (!user) {
        throw new UnauthorizedException('Invalid email');
      }

      if (user && !user.isVerified) {
        throw new UnauthorizedException('Please verify your account first');
      }

      if (!user?.provider) {
        throw new UnauthorizedException(`Please login with email and password`);
      }

      if (
        user?.provider?.includes(
          (item) => item?.providerName === providerLoginDTO?.provider,
        )
      ) {
        throw new UnauthorizedException(
          `Email is not registered with ${providerLoginDTO?.provider} provider`,
        );
      }

      if (
        !(await bcrypt.compare(providerLoginDTO?.providerID, user?.providerID))
      ) {
        throw new UnauthorizedException(`Invalid provider id`);
      }

      user = JSON.parse(JSON.stringify(user));

      delete user.password;
      delete user.providerID;

      const token = await this.generateToken(user);
      return { user, token };
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(err.message);
    }
  }

  async signupForAdminPanel(userDto) {
    try {
      let user: Admin;
      if (userDto.email) {
        user = await this._adminModel.findOne({
          email: userDto.email.toLowerCase(),
        });
        if (user) {
          throw new ForbiddenException('Email already exists!');
        }

        userDto.email = userDto.email.toLowerCase();
      }
      if (userDto.phoneNumber) {
        user = await this._adminModel.findOne({
          phoneNumber: userDto.phoneNumber,
        });

        if (user) {
          throw new ForbiddenException('Phone Number already exists!');
        }
      }

      userDto._id = await new Types.ObjectId().toHexString();

      userDto.admin = true;

      let userData = await new this._adminModel(userDto).save();

      userData = JSON.parse(JSON.stringify(userData));
      delete userData.password;

      return {
        userData,
      };
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async loginForAdminPanel(loginDto) {
    try {
      let user: any = await this._adminModel.findOne({
        email: loginDto.email,
        admin: true,
        deletedCheck: false,
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email');
      }

      if (await bcrypt.compare(loginDto.password, user.password)) {
        user = JSON.parse(JSON.stringify(user));
        delete user.password;
        // const token = await this.generateToken(user);

        user = JSON.parse(JSON.stringify(user));
        delete user.password;

        const token = await this.generateToken(user);
        return { user, token };
      } else {
        throw new UnauthorizedException('Incorrect credentials');
      }
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(err.message);
    }
  }

  async forgetPassword(phoneDTO: PhoneDTO) {
    try {
      const user = await this._userModel.findOne({
        phoneNumber: phoneDTO.phoneNumber,
      });

      if (!user) {
        throw new BadRequestException('User not found for this phone number');
      }

      const sendValue = await this.twilioClient.verify
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phoneDTO.phoneNumber,
          channel: 'sms',
          locale: 'en',
        });

      console.log({ sendValue });

      return {
        message: 'Otp is sent. Please verify.',
      };
    } catch (err) {
      console.log('err');
      throw new BadRequestException(err.message);
    }
  }

  async verifyForForgetPassword(verifyDto: VerifyDTO) {
    try {
      let user: any = await this._userModel.findOne({
        phoneNumber: verifyDto.phoneNumber,
      });

      if (!user) {
        throw new HttpException(
          'Incorrect phone number',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.twilioClient.verify
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: verifyDto.phoneNumber,
          code: verifyDto.code,
        });

      console.log(result);

      if (result.status === 'expired') {
        throw new HttpException('expired', HttpStatus.UNAUTHORIZED);
      } else if (!result.valid || result.status !== 'approved') {
        throw new HttpException('wrong code provided', HttpStatus.UNAUTHORIZED);
      }

      user = JSON.parse(JSON.stringify(user));
      delete user.password;

      user.isForgetPassword = true;

      const token = await this.generateToken(user);

      return token;
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err.message);
    }
  }

  async resetPassword(resetPasswordDto, user) {
    try {
      if (!user.isForgetPassword) {
        throw new UnauthorizedException('Cannot reset password at this stage');
      }
      const userData = await this._userModel.findOne({ _id: user.id });

      if (!userData) {
        throw new UnauthorizedException('No user found');
      }
      const update = await this._userModel.updateOne(
        { _id: user.id },
        { password: resetPasswordDto.password },
      );

      return update;
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(err.message);
    }
  }

  private generateToken(payload) {
    return {
      access_token: `Bearer ${this.jwtService.sign(payload)}`,
    };
  }

  async generateAvatar() {
    try {
      const canvas = createCanvas(200, 200);
      const ctx = canvas.getContext('2d');
      ctx.font = '30px Impact';
      ctx.rotate(0.1);
      ctx.fillText('Awesome!', 50, 100);

      const buffer = canvas.toBuffer('image/png');
      writeFileSync('./image.png', buffer);
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err);
    }
  }

  async appleRedirectAPI(data) {
    try {
      console.log('appleRedirectIssue called');
    } catch (err) {
      console.log(err);
      throw new BadRequestException(err?.message);
    }
  }

  async verifyRecaptcha(tokenDto:RecaptchaDTO){
    try{
      const url = `${process.env.GOOGLE_RECAPTCHA_VERIFY_URL}${tokenDto?.recaptchaToken}`
      const res = await axios.post(url);

      return res?.data;
    }
    catch(err){
      console.log(err);
      throw new UnauthorizedException(err?.message);
    }
  }
}
