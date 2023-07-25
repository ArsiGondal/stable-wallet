import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PhoneDTO } from '../auth/dto/Phone.dto';
import { EmailDTO } from './dto/email.dto';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { User } from './interface/user.interface';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { Wallet } from 'ethers';
import { EmailProviderDTO } from './dto/emailWithProvider.dto';
var fs = require('fs');

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private _userModel: Model<User>,
    @InjectModel('Wallet') private _walletModel: Model<Wallet>,
  ) {}

  async getAllUsers() {
    return await this._userModel.find({});
  }

  async getLoggedInProfile(user) {
    return await this._userModel.findOne({ _id: user.id });
  }

  async isPhoneNumberExists(phoneDto) {
    const user = await this._userModel.findOne({
      phoneNumber: phoneDto.phoneNumber,
      isVerified: true,
    });
    if (user) {
      return {
        status: true,
      };
    } else {
      return {
        status: false,
      };
    }
  }

  async isEmailExists(emailDto: EmailDTO) {
    const user = await this._userModel.findOne({
      email: emailDto?.email?.toLowerCase(),
      isVerified: true,
    });
    if (user) {
      return {
        status: true,
      };
    } else {
      return {
        status: false,
      };
    }
  }

  async isEmailExistsWithProvider(emailProviderDTO: EmailDTO) {
    const user = await this._userModel.findOne({
      email: emailProviderDTO?.email?.toLowerCase(),
      isVerified: true,
    });
    if (user) {
      return {
        email: user?.email,
        provider: user?.provider,
      };
    } else {
      return {
        email: '',
        provider: [],
      };
    }
  }

  async updateUser(user, updateUserDto: UpdateUserDTO) {
    try {
      user = await this._userModel.findOne({ _id: user.id });

      const updatedUser = await this._userModel.updateOne(
        { _id: user.id },
        updateUserDto,
      );

      return { message: 'User updated successfully!' };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async changePassword(user, changePasswordDto: ChangePasswordDTO) {
    try {
      let currentUser = await this._userModel.findOne({ _id: user.id });
      if (!currentUser) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      const comaprePasswords = await bcrypt.compare(
        changePasswordDto.oldPassword,
        currentUser.password,
      );

      if (!comaprePasswords) {
        throw new UnauthorizedException('Incorrect password!');
      }
      await this._userModel.updateOne(
        { _id: user.id },
        { password: changePasswordDto.newPassword, newUser: false },
      );

      return { message: 'Password updated successfully!' };
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteProfile(userID, user) {
    try {
      if (userID != user.id) {
        throw new Error('Unauthorized to delete this profile');
      }

      const deleteUser = await this._userModel.deleteOne({ _id: userID });
      const deletedWallets = await this._walletModel.deleteMany({
        userID: userID,
      });

      return {
        status: 'success',
      };
    } catch (err) {
      throw new BadRequestException(err?.message);
    }
  }

  async getSignedUpUsers(fromDate: any, toDate: any) {
    try {
      if (!fromDate) {
        fromDate = new Date(0);
      }

      if (!toDate) {
        toDate = new Date(4090463138000);
      }

      fromDate = new Date(Number(fromDate));
      toDate = new Date(Number(toDate));

      // let users: any = await this._userModel.find({
      //   $and: [
      //     { createdAt: { $gte: fromDate } },
      //     { createdAt: { $lte: toDate } },
      //   ],
      // });

      let users: any = await this._userModel.aggregate([
        {
          $match: {
            $and: [
              { createdAt: { $gte: fromDate } },
              { createdAt: { $lte: toDate } },
            ],
          },
        },
        {
          $lookup: {
            from: 'wallet',
            as: 'wallets',
            localField: '_id',
            foreignField: 'userID',
            pipeline: [
              { $project: { walletAddress: 1 } },
              { $project: { _id: 0 } },
            ],
          },
        },
      ]);

      var data = [
        ['First Name', 'Last Name', 'Email', 'Phone Number', 'wallets'],
      ];
      users.forEach((el) => {
        let user = [];
        let wallets = '';
        wallets = el.wallets.map((el) => el.walletAddress);
        user.push(el.firstname);
        user.push(el.lastname);
        user.push(el.email);
        user.push(el.phoneNumber.replace(el.phoneNumber.substring(0, 1), ''));
        user.push(wallets);
        data.push(user);
      });

      var finalData = '';

      for (var i = 0; i < data.length; i++) {
        var value = data[i];

        for (var j = 0; j < value.length; j++) {
          var innerValue = value[j] === null ? '' : value[j].toString();
          var result = innerValue.replace(/"/g, '""');
          if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
          if (j > 0) finalData += ',';
          finalData += result;
        }

        finalData += '\n';
      }

      let randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');

      const url = `${process.env.URL}media-upload/mediaFiles/histories/${randomName}.csv`;

      fs.promises.writeFile(
        `./mediaFiles/NFT/histories/${randomName}.csv`,
        finalData,
      );

      return { url: url };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateVisitInfo(updateVisitInfoDto, user) {
    try {
      if (updateVisitInfoDto.source == 'Mobile') {
        updateVisitInfoDto.lastMobileVisit = Date.now();
      }

      if (updateVisitInfoDto.source == 'Web') {
        updateVisitInfoDto.lastWebVisit = Date.now();
      }

      await this._userModel.updateOne({ _id: user.id }, updateVisitInfoDto);

      return { message: 'Updated Successfully!' };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
